// ==UserScript==
// @name           mysqlgame
// @namespace      http://github.com/biba/mysqlgame
// @description    mysqlgame bot
// @include        http://mysqlgame.com/dashboard
// @require        http://ajax.googleapis.com/ajax/libs/jquery/1.3.2/jquery.min.js
// ==/UserScript==

attackhelper=1;
defensehelper=1;
rows=null;
pillageLevel=0;
myrownumber=-1;
myrow=null;
myrows=null;
managemode=true;
huntmode=false;
scanmode=false;
scanrow=0;
minscanrow=-1;
maxscanrow=-1;
ordersTimer=0;
ordersThreadInterval=101;
maxOrdersThreadInterval=3017;
scanThreadInterval=1293;
lastSwitchedToRow=0;
ordersAttackQueue=new Array();
ordersManageQueue=new Array();
honeyQueue=new Array();
botsArray=new Array();
moneyGain = 0;
fuelGain = 0;

// defenders to buy if threshold is reached
defenderAmount = 500000;
defendersPrice = defenderAmount * 10;

maxAttackersToBuy = 50000;
maxAttackersForSingleAttack = 250000;
maxFuelForSingleAttack = 10000000;

createButtons();
// add custom style for "can-delete" rows
addGlobalStyle('.can-delete { color: red ! important; border: solid 1px red; }');
update_browse_data_original=unsafeWindow.update_browse_data;
unsafeWindow.update_browse_data=function(e){
    update_browse_data_original(e);
    getrows(e);
};

update_rows_original=unsafeWindow.update_rows;
unsafeWindow.update_rows=function(e){
    myrownumber=e[1];
    update_rows_original(e);
    getmyrows(e);
};
setTimeout(function(){
    unsafeWindow.updateRows();
},500);

document.getElementById('query_log_content').addEventListener('DOMNodeInserted',watchQueries,true);
document.getElementById('browse_query').addEventListener('DOMNodeInserted',watchBrowser,true);
ordersThreadNum=window.setInterval(ordersThread,ordersThreadInterval);
scanThreadNum=window.setInterval(scanThread,scanThreadInterval);
window.setTimeout(function(){
    scan(myrow?myrow.row_id:unsafeWindow.rowID());
},500);

function addGlobalStyle(css) {
    var head, style;
    head = document.getElementsByTagName('head')[0];
    if (!head) { return; }
    style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = css;
    head.appendChild(style);
}


function watchBrowser(e){
    if (!e.target.tagName||e.target.tagName!="A") return;
    e.target.addEventListener('click',function(){
        if (scanmode)turnOffScan();
    },true);
}

function watchQueries(e){    
    
    var t = e.target;
    if (!t.tagName || t.tagName != 'TR') return;
    if (t.className.match(/^attack/)){
        var runby = t.getElementsByClassName('run_by');
        if (runby.length == 1 && document.getElementById('personal_link').style.color == "black"){
            log(t.cells[0].innerHTML,t.cells[1].innerHTML);
        } else {
            // own attack
            // log(t.cells[1].innerHTML);
            var text = t.cells[1].innerHTML;
                
            text += '';
            
            var rgx = /attackers-(\d+)\+(\d+).*money\+(\d+).*fuel\+(\d+)-(\d+)/;//.(\d+).*money.(\d+)/;
            /*while (rgx.test(x1)) {
                x1 = x1.replace(rgx, '$1' + "'" + '$2');
            }*/
            var r = text.match(rgx);
            var attackersLost = parseInt(r[1]);
            var attackersWon = parseInt(r[2]);
            var money = parseInt(r[3]);
            var fuelWon = parseInt(r[4]);
            var fuelLost = parseInt(r[5]);

            var profit = ((-attackersLost + attackersWon) * 20 + money + (fuelWon - fuelLost));
            
            //log("profit: " + r[1] + r[2] + "money+" + r[3] + "fuel" + r[4] + "-" + r[5]);
            //log("profit: " +  profit);

            //log("var " + document.getElmentsByClassName('panel_header')[0].childNodes[0].innerHTML);

            moneyGain += money +(-attackersLost + attackersWon) * 20;
            foo.innerHTML = " " + addCommas(moneyGain);

            fuelGain += (fuelWon - fuelLost);
            bar.innerHTML = " " + addCommas(fuelGain);

        }

    } 
}

function createButtons(){

    var logcontainer=$('.panel_header').get(2);
    $(logcontainer).before($(document.createElement('div')).attr('id', 'statusbox'));
    honeybox=document.createElement('div');
    honeybox.id='honeybox';
    var attackcontainer=$('.panel_header').get(1);
    $(attackcontainer).before($(document.createElement('div')).attr('id', 'statusbox'));

    defensebutton=document.createElement('a');
    defensebutton.innerHTML="reset";
    defensebutton.href="javascript:void(0);";
    defensebutton.addEventListener('click',function(){
        //defensehelper=!defensehelper;
        moneyGain = 0;
        fuelGain = 0;
    },true);

    attackbutton=document.createElement('a');
    attackbutton.innerHTML="offense";
    attackbutton.href="javascript:void(0);";
    attackbutton.addEventListener('click',function(){
        attackhelper=!attackhelper;
    },true);

    huntbutton=document.createElement('a');
    huntbutton.innerHTML="attack (off)";
    huntbutton.href="javascript:void(0);";
    huntbutton.addEventListener('click',toggleHunt,true);

    scanbutton=document.createElement('a');
    scanbutton.innerHTML="scan (off)";
    scanbutton.href="javascript:void(0);";
    scanbutton.addEventListener('click',toggleScan,true);

    managebutton=document.createElement('a');
    managebutton.innerHTML="manage (on)";
    managebutton.href="javascript:void(0);";
    managebutton.addEventListener('click',toggleManage,true);

    divcontainer = $('.panel_header').get(0);
    foo = document.createElement('adsf');
    bar = document.createElement('fdsa');

    mo = document.createElement('money');
    mo.innerHTML = ' money: ';

    fu = document.createElement('fuel');
    fu.innerHTML = ' fuel: ';

    foo.innerHTML = '0';
    bar.innerHTML = '0'
    var myChild = document.getElementsByClassName('panel_header')[0].childNodes[1];
    document.getElementsByClassName('panel_header')[0].insertBefore(mo, myChild);
    document.getElementsByClassName('panel_header')[0].insertBefore(foo, myChild);
    document.getElementsByClassName('panel_header')[0].insertBefore(fu, myChild);
    document.getElementsByClassName('panel_header')[0].insertBefore(bar, myChild);

    divcontainer.appendChild(defensebutton);divcontainer.appendChild(document.createTextNode(" "));
    divcontainer.appendChild(attackbutton);divcontainer.appendChild(document.createTextNode(" "));
    divcontainer.appendChild(huntbutton);divcontainer.appendChild(document.createTextNode(" "));
    divcontainer.appendChild(scanbutton);divcontainer.appendChild(document.createTextNode(" "));
    divcontainer.appendChild(managebutton);

    logbox=document.createElement('div');
    logbox.id="important_messages";logbox.style.height="100px";logbox.className="log";
    logbox.appendChild(document.createElement('table'));
    logtable=document.createElement('tbody');
    logbox.firstChild.appendChild(logtable);
    document.getElementById('bottomright').insertBefore(logbox,document.getElementById('bottomright').firstChild);

    shardnum=document.getElementById('dashboard_header').childNodes[1].innerHTML.match(/[0-9]+/)*1;

//shardnum=0;
}

function removeOrders(type) {
    if (type=="attack")
        ordersAttackQueue=new Array();
    else 
        for (var i=0;i<ordersManageQueue.length;i++)
            if (ordersManageQueue[i].type==type){
                for (var j=i+1;j<ordersManageQueue.length;j++)
                    ordersManageQueue[j-1]=ordersManageQueue[j];
                ordersManageQueue.pop();
                i--;
            }
}

function toggleManage() {
    if (managemode){
        managemode=false;
        removeOrders("buydefenders");
        removeOrders("buyattackers");
        managebutton.innerHTML="manage (off)";
    }
    else{
        managemode=true;
        managebutton.innerHTML="manage (on)";
    }
}

function turnOffScan() {
    scanmode=0;
    scanbutton.innerHTML="scan (off)";
    status("Scan ended");
}
function toggleScan() {
    if (scanmode)
        turnOffScan();
    else{
        if (rows&&rows[0])
            scanrow=rows[0].row_id;
        else if (myrow)
            scanrow=myrow.row_id;
        else
            scanrow=1000;
        scanmode=1;
        scanbutton.innerHTML="scan (on)";
        status("Starting scan");
    }
}
function toggleHunt(){
    if (huntmode){
        huntmode=0;
        removeOrders("attack");
        huntbutton.innerHTML="attack (off)";
    }
    else{
        huntmode=1;
        huntbutton.innerHTML="attack (on)";
    }
}
function scanThread(){
    if (!scanmode)
        return;
    if (ordersAttackQueue.length>0)
        return;//wait for attacks to finish
    scanrow+=10;
    if (scanrow>maxscanrow)
        scanrow=minscanrow;
    status("Scanning region "+scanrow);
    scan(scanrow);
}

function hunt(){
    var numattacked=0;
    for (var r = 0; r < rows.length; r++){
        var row=rows[r];
        if (row.owner == "") continue;
        var bestAttackRow=-1;
        var bestAttackForce=0;
        var bestDistance=0;
        var bestMoneyGain=0;
        var bestFuelGain=0;
        for (var m = 0; m < myrows.length; m++){
            var arow=myrows[m];
            if ((bestAttackRow != -1) && (myrows[bestAttackRow].attack_multiplier > arow.attack_multiplier))
                continue;14
            if ((row.attack_multiplier+3 < arow.attack_multiplier) && (row.defense_multiplier+3 < arow.attack_multiplier))
                continue;
            var distance=row.row_id-arow.row_id;
            if (distance<0) distance*=-1;
            var looseAttackersMax=Math.floor((row.attackers*row.attack_multiplier+row.defenders*row.defense_multiplier)*1.2/arow.attack_multiplier+1);
            var losses=Math.floor((looseAttackersMax-row.defenders/16)*20+1);
            var netMoneyGain=row.money-losses;
            var needPillagers=Math.floor((row.money>row.fuel?row.money:row.fuel)/arow.pillageLevel-row.defenders/16+1);
            var attackForce=looseAttackersMax+needPillagers;
            var fuelCost=Math.floor(attackForce*distance*arow.fuelCost+1);
            var netFuelGain=row.fuel-fuelCost;
            if (netMoneyGain>bestMoneyGain) {
                bestMoneyGain=netMoneyGain;bestFuelGain=netFuelGain;
            }
            if (netMoneyGain<1000)
                continue;//not profitable
            var fuelMoneyRatio=0.75;//take 100 money at a loss of up to 75 fuel
            if (netFuelGain<0&&netFuelGain*-1>netMoneyGain*fuelMoneyRatio){//not sustainable
                needPillagers=Math.floor(row.fuel*(1+fuelMoneyRatio)/arow.pillageLevel-row.defenders/16+1);
                attackForce=needPillagers+looseAttackersMax;
                fuelCost=Math.floor(attackForce*distance*arow.fuelCost+1);
                netFuelGain=row.fuel-fuelCost;
                netMoneyGain=needPillagers*arow.pillageLevel-losses;
                if (row.money<netMoneyGain) netMoneyGain=row.money;
                if (netMoneyGain<1000||netFuelGain<0&&netFuelGain*-1>netMoneyGain*fuelMoneyRatio)
                    continue;//not sustainable
            }
            if (attackForce>100000){
                queueHoney(row,attackForce);
                continue;//chicken
            }
            if ((bestAttackRow == -1) || (arow.attack_multiplier > myrows[bestAttackRow].attack_multiplier) ||( distance < bestDistance)) {
                bestAttackRow = m; bestAttackForce = attackForce; bestDistance = distance;
            }
        }
        if (bestAttackRow!=-1){
            arow=myrows[bestAttackRow];
            queueAttack(row.row_id,bestAttackForce,arow.row_id);
        }
        else if (bestMoneyGain > 100000 && ( bestFuelGain * -1 < bestMoneyGain * 3) ||
                 bestFuelGain > 100000 && ( bestFuelGain > bestMoneyGain*-3))
            queueHoney(row,bestAttackForce);
    }
}

function queueBuyAttackers(id,attackers){
    var order=new Object();
    order.type="buyattackers";
    order.id=id
    order.amount=attackers;
    var present=false;
    for (var i=0;i<ordersManageQueue.length;i++)
        if (ordersManageQueue[i].type=="buyattackers"&&ordersManageQueue[i].id==id)
            present=true;
    if (!present)
        ordersManageQueue.unshift(order);
}

function queueAttack(id,attackers,fromid){
    status("Queueing up attack on row "+id+" from row "+fromid+" with "+attackers+" attackers");
    var order=new Object();
    order.type="attack";
    order.id=id;order.attackers=attackers;order.fromid=fromid;
    var alreadyPresent=0;
    for (var a=0;a<ordersAttackQueue.length;a++){
        if (ordersAttackQueue[a].id==id){
            ordersAttackQueue[a]=order;
            alreadyPresent=1;
            break;
        }
    }
    if (!alreadyPresent)
        ordersAttackQueue.push(order);
}


function ordersThread(){
    ordersTimer+=ordersThreadInterval;
    /*if (lastSwitchedToRow>0&&myrow.row_id==lastSwitchedToRow){
      lastSwitchedToRow=0;
      ordersTimer+=maxOrdersThreadInterval;
      }*/
    if (!(ordersTimer>=maxOrdersThreadInterval))
        return;//wait some more
    if (document.getElementById('queries_response_string').innerHTML.match(/captcha/i)){//captcha breaking, anyone?
        status("Solve captcha to continue");
        if (scanmode)
            turnOffScan();
        ordersAttackQueue=new Array();
        ordersManageQueue=new Array();
        return;
    }

    if (ordersManageQueue.length==0){
        if (ordersAttackQueue.length>0){
            //increase the frequency of this thread to overtake other bots
            maxOrdersThreadInterval-=11;//optimizing for maximum speed
            attackThread();
            ordersTimer=0;
        }
        return;
    }

    ordersTimer=0;
    var order=ordersManageQueue.shift();
    if (!order) {
        if (!scanmode)
            status("Idle");
        return;
    }

    if (order.type=="pause"){
        status("Waiting");
        if (order.count<1) {
            for (var i=0;i<ordersManageQueue.length;i++)
                if (ordersManageQueue[i].type==order.reason&&ordersManageQueue[i].id==order.id){
                    for (var j=i+1;j<ordersManageQueue.length;j++)
                        ordersManageQueue[j-1]=ordersManageQueue[j];
                    ordersManageQueue.pop();
                }
            return;
        }
        order.count--;
        ordersManageQueue.unshift(order);
        return;
    }
    if (order.type=="buydefenders"){
        if (order.id != myrow.row_id || document.getElementsByName('row_id')[7].value!=myrow.row_id){
            ordersManageQueue.unshift(order);
            switchRow(order.id);
            return;
        }
        buydefenders(order);
        pause(3,"buydefenders",order.id);
    }
    if (order.type=="buyattackers"){
        if (order.id!=myrow.row_id||document.getElementsByName('row_id')[6].value!=myrow.row_id){
            ordersManageQueue.unshift(order);
            switchRow(order.id);
            return;
        }
        buyattackers(order);
        pause(1,"buyattackers",order.id);
    }
}

function attackThread(){
    if (ordersAttackQueue.length==0) return;
    var activated=new Object();
    var redo=new Array();
    s="";
    for (var i=0;i<ordersAttackQueue.length;i++){
        var order=ordersAttackQueue[i];
        s += order.fromid+" "+activated[order.fromid]+"\n";
        if (activated[order.fromid]) {
            continue;
        }
        activated[order.fromid]=true;
        for (var j=i+1;j<ordersAttackQueue.length;j++)
            ordersAttackQueue[j-1]=ordersAttackQueue[j];
        ordersAttackQueue.pop(); i--;
        var fromrow = getMyrowById(order.fromid);
        if (order.attackers > fromrow.attackers){
            // 3000 = 5000 - 2000
            var needBuyAttackers = order.attackers - fromrow.attackers + 25;
            // 50000 - 2000 > 3000 ?
            //if (maxAttackersToBuy - fromrow.attackers > needBuyAttackers) {
                //47000 = 50000 - 3000
            //    needBuyAttackers = maxAttackersToBuy - fromrow.attackers;
            //}
            
            if (managemode && needBuyAttackers < maxAttackersToBuy && needBuyAttackers * 20 < fromrow.money){
                redo.push(order);
                queueBuyAttackers(fromrow.row_id, needBuyAttackers);
                continue;
            }

            else{
                queueHoney(row,attackForce);
                continue;;//not feasible to attack
            }
        }
        attack(order);
    }
    //    alert(activated[2158]+" "+(activated[2158]==true));
    while (redo.length>0)
        ordersAttackQueue.push(redo.pop());
    if (scanmode){
        window.clearInterval(scanThreadNum);
        scanThread();
        scanThreadNum=window.setInterval(scanThread,scanThreadInterval);
    }
}

function pause(s,reason,id){
    removeOrders("pause");
    var order=new Object();
    order.type="pause";
    order.count=s;
    order.reason=reason;
    order.id=id;
    ordersManageQueue.unshift(order);
}

function getMyrowById(id){
    for (var m=0;m<myrows.length;m++)
        if (myrows[m].row_id==id) return myrows[m];
    return null;
}
function buyattackers(order){
    status("Buying "+order.amount+" attackers at row "+order.id);
    var attackersbox=document.getElementsByName("attackers")[1];
    attackersbox.value=order.amount;
    if (order.amount > maxAttackersToBuy){
        status("Afraid to buy " + order.amount + " attackers, do manually");
        return;
    }
    var button=attackersbox.parentNode.nextSibling.nextSibling.firstChild;
    if (!(button.name=="submit"&&button.nextSibling.name=="query"&&button.nextSibling.value=="BuyAttackers")){
        log("Danger, layout changed, cannot find buy attackers button");
        return;
    }
    log("Buying "+order.amount+" attackers at row "+order.id);
    button.click();
}

function buydefenders(order){
    status(" Buying " + order.amount+" defenders at row "+order.id);
    var defendersbox=document.getElementsByName("defenders")[0];
    defendersbox.value=order.amount;
    if (order.amount > defenderAmount){
        status("Afraid to buy "+amount+" defenders, do manually");
        return;
    }
    var button = defendersbox.parentNode.nextSibling.nextSibling.firstChild;
    if (!(button.name == "submit" && button.nextSibling.name == "query" && button.nextSibling.value == "BuyDefenders")){
        log("Danger, layout changed, cannot find buy defenders button");
        return;
    }
    log(" Buying "+order.amount+" defenders at row "+order.id);
    button.click();
}

function attack(order){
    status("Attacking row "+order.id+" from row "+order.fromid +" with "+order.attackers+" attackers");
    var fromrow=getMyrowById(order.fromid);

    for (var i=0;i<honeyQueue.length;i++)
        if (honeyQueue[i].row_id==order.id){
            for (var j=i+1;j<honeyQueue.length;j++)
                honeyQueue[j-1]=honeyQueue[j];
            honeyQueue.pop();
            displayHoney();
        }
    var needFuel=Math.floor(Math.abs(fromrow.row_id-order.id)*fromrow.fuelCost*order.attackers+1);

    if (order.attackers > maxAttackersForSingleAttack || needFuel > maxFuelForSingleAttack){
        status("Afraid to send " + order.attackers + " attackers to row " + order.id + " for " + needFuel + " fuel, use manual override");
        var targetbox=document.getElementsByName("target")[0];
        targetbox.value=order.id;
        var attackersbox=document.getElementsByName("attackers")[0];
        attackersbox.value=order.attackers;
        var frombox=document.getElementsByName("row_id")[5];
        frombox.value=order.fromid;
        document.getElementsByClassName('desc')[6].childNodes[2].data=' FROM row_id='+order.fromid+' WITH attackers=';
        if (targetbox.nextSibling.nextSibling!=attackersbox){
            log("Danger, layout changed, cannot find attack query box");
        }
        return;
    }
    var query={
        'target':order.id,
        'attackers':order.attackers,
        'submit':'go',
        'query':'Attack',
        'row_id':fromrow.row_id
    };
    unsafeWindow.$.post('/update/queries',query,
        function(e){
            if (e.match(/current row locked/))
                maxOrdersThreadInterval+=352;
            if (maxOrdersThreadInterval>5001) maxOrdersThreadInterval=5001;
            unsafeWindow.update_queries_data(e);
            if (e.match(/row has already been attacked|target row locked/)){
                var fromid=e.match(/Queries For Row ([0-9]+)/)[1]*1;
                for (var i=0;i<ordersAttackQueue.length;i++)
                    if (ordersAttackQueue[i].fromid==fromid){
                        var order=ordersAttackQueue[i];
                        for (var j=i+1;j<ordersAttackQueue.length;j++)
                            ordersAttackQueue[j-1]=ordersAttackQueue[j];
                        ordersAttackQueue.pop();
                        attack(order);
                    }
            }
        }
        );
}

function queueHoney(row,attackForce){
    for (var i=0;i<honeyQueue.length;i++){
        if (honeyQueue[i].row_id==row.row_id)
            return;
    }
    honeyQueue.unshift(row);
    if (honeyQueue.length>13)
        honeyQueue.pop();
    displayHoney();
}
function displayHoney(){
    var honeystring="";
    if (honeyQueue.length>0)
        honeybox.innerHTML="Check: ";
    else
        honeybox.innerHTML="";
    for (var i=0;i<honeyQueue.length;i++){
        var a=document.createElement('a');
        a.innerHTML=honeyQueue[i].row_id;a.href='javascript:void(0)';
        a.addEventListener('click',function(e){
            scan(this.text);
        },true);
        honeybox.appendChild(a);
        honeybox.appendChild(document.createTextNode(" "));
    }
}

function switchRow(id){
    status("Switching to row "+id);
    var field=document.getElementById('row_'+id+'_row_id,row_id');
    var mouseEvent=document.createEvent('MouseEvents');
    mouseEvent.initEvent('click', true, true);
    field.dispatchEvent(mouseEvent);
    lastSwitchedToRow=id;
}

function status(s){
    statusbox.innerHTML=s;
}

function log(a, b, c){
    var row = document.createElement('tr');
    if ((logtable.rows.length % 2) == 0)
        row.className = "attack even";
    else
        row.className = "attack odd";
    var cell = document.createElement('td');
    cell.innerHTML = a;
    row.appendChild(cell);
    if (b){
        // attacks
        cell = document.createElement('td');
        cell.innerHTML=b;
        row.appendChild(cell);
    } else {
        var d = new Date();
        cell = document.createElement('td');
        cell.innerHTML=d.getHours() + ":" + (d.getMinutes() < 10 ? "0" : "" ) + d.getMinutes() + ":" + (d.getSeconds()<10?"0":"")+d.getSeconds();
        row.insertBefore(cell,row.firstChild);
    }
    if (c){
        cell=document.createElement('td');
        cell.innerHTML=c;
        row.appendChild(cell);
    }
    GM_log(row.innerHTML);
    logtable.insertBefore(row,logtable.firstChild);
}

function getmyrows(e){
    if (!e) return;
    var trs=document.getElementById('rows_content').rows;
    var newmyrows=new Array();
    fu.innerHTML = '0';
    mo.innerHTML = '0';
    for (c = 0; c < e.length; c++){
        var row=new Object();
        var f=e[c];
        row.row_id=f[0]*1;
        if (row.row_id==myrownumber)
            myrow=row;
        row.name=f[1];
        row.owner=f[2];
        row.money_factories=f[3]*1;
        row.money=f[4]*1;
        mo.innerHTML = parseInt(mo.innerHTML) + row.money;

        row.fuel_factories=f[5]*1;
        row.fuel=f[6]*1;
        fu.innerHTML = parseInt(fu.innerHTML) + row.fuel;

        row.attackers=f[7]*1;
        row.attack_multiplier=f[8]*1;
        row.defenders=f[9]*1;
        row.defense_multiplier=f[10]*1;
        row.row_creators=f[11]*1;
        row.pillageLevel=10;
        row.fuelCost=1;

        if (row.attack_multiplier>=5){
            row.pillageLevel=20;
            row.fuelCost=0.5;
        }
        if (row.attack_multiplier>=8){
            row.pillageLevel=30;
            row.fuelCost=0.25;
        }
        if (row.attack_multiplier>=11){
            row.pillageLevel=40;
            row.fuelCost=0.125;
        }
        if (row.attack_multiplier>=14){
            row.pillageLevel=50;14
            row.fuelCost=0.0625;
        }
        if (row.attack_multiplier>=17){
            row.pillageLevel=60;
            row.fuelCost=0.03125;
        }
        if (row.attack_multiplier>=20){
            row.pillageLevel=70;
            row.fuelCost=0.015625;
        }
        
        var maxreach = row.row_id + row.pillageLevel / row.fuelCost;
        var minreach = row.row_id - row.pillageLevel / row.fuelCost;

        if (maxscanrow == -1 || maxreach > maxscanrow) {
            maxscanrow = Math.floor(maxreach/10+1)*10;
        }
        if (minscanrow==-1||minreach<minscanrow) {
            minscanrow=Math.floor(minreach/10)*10;
            if (minscanrow<0) minscanrow=0;
        }
        var maxlevel= (row.defense_multiplier > row.attack_multiplier ? row.defense_multiplier : row.attack_multiplier) + 3;
        var maxmoney_attackerprofits = Math.floor((row.attackers * row.attack_multiplier + row.defenders * row.defense_multiplier)/ maxlevel / 1.2 * 20 - row.defenders / 4 * 20);
        var attackerdamage=Math.floor((row.attackers*row.attack_multiplier+row.defenders*row.defense_multiplier)/maxlevel-row.defenders/8)*20;
        var selfdamage=row.attackers*20+Math.floor(row.defenders/4+1)*10;
        var maxmoney_attackerdamages=Math.floor((attackerdamage-selfdamage)/2);//how much money can have before attacker can hurt you more than self

        newmyrows[c]=row;

        if (defensehelper){
            trs[4].cells[c].innerHTML = addCommas(row.money) + " " + addCommas(maxmoney_attackerprofits);//+" "+maxmoney_attackerdamages;
            trs[6].cells[c].innerHTML = addCommas(row.fuel); // fuel
            trs[7].cells[c].innerHTML = addCommas(row.attackers); // attackers
            trs[9].cells[c].innerHTML = addCommas(row.defenders); // defenders
        }
        // secure own money if it is at 90% of the value where attacker profits
        if (managemode && (row.money) > (0.9 * maxmoney_attackerprofits) && row.money > defendersPrice){
            var order = new Object();
            order.type = "buydefenders";
            order.rownumber = c;
            order.id = row.row_id;
            order.amount = defenderAmount;
            var queued = false;
            for (var i = 0; i < ordersManageQueue.length; i++)
                if (ordersManageQueue[i].type == "buydefenders" && ordersManageQueue[i].id == order.id){
                    ordersManageQueue[i]=order;
                    queued=true;
                }
            if (!queued)
                ordersManageQueue.unshift(order);
        }
    }
    myrows=newmyrows;
    fu.innerHTML = " fuel(" + addCommas(fu.innerHTML) + ") ";
    mo.innerHTML = " money(" + addCommas(mo.innerHTML) + ") ";
}

function addCommas(nStr)
{
    var negative = false;
    if (parseInt(nStr) < 0) negative = true;
    nStr += '';
    x = nStr.split('.');
    x1 = x[0];    
    var rgx = /(\d+)(\d{3})/;
    while (rgx.test(x1)) {
        x1 = x1.replace(rgx, '$1' + "'" + '$2');
    }
    if (!negative) return x1;
    else return x1;
}


function formatString(s) {
    var n = "";
    for (var i = 0; i < s.length; i++){
        n += s[i];
        if (i % 3 == 0) {
            n += "'";
        }
    }
    return n;
}

function scan(i){
    unsafeWindow.$.post('/update/browse',{
        'row_id':(myrow?myrow.row_id:unsafeWindow.rowID()),
        'start':i
    },unsafeWindow.update_browse_data,data='json');
}

function getrows(e){
    if (!e || !e['rows'])
        return;
    var rs=e['rows'];
    nrs=new Array();
    for (var r=0;r<rs.length;r++){
        var row=new Object();
        var f=rs[r].fields;
        row.row_id=f[0]*1;
        row.name=f[1];
        row.owner=f[2];
        row.money_factories=f[3]*1;
        row.money=f[4]*1;
        row.fuel_factories=f[5]*1;
        row.fuel=f[6]*1;
        row.attackers=f[7]*1;
        row.attack_multiplier=f[8]*1;
        row.defenders=f[9]*1;
        row.defense_multiplier=f[10]*1;
        row.row_creators=f[11]*1;
        nrs.push(row);
        if (attackhelper && row.owner!=""){
            var attackLevel=4;
            var pillageLevel=10;
            if( row.attack_multiplier >= 2 || row.defense_multiplier >= 2){
                attackLevel = 5; pillageLevel = 20;
            }
            if(row.attack_multiplier >= 5 || row.defense_multiplier >= 5){
                attackLevel = 8;pillageLevel = 30;
            }
            if(row.attack_multiplier >= 8 || row.defense_multiplier >= 8){
                attackLevel = 11; pillageLevel = 40;
            }
            if(row.attack_multiplier >= 11 || row.defense_multiplier >= 11){
                attackLevel = 14; pillageLevel = 50;//if you can afford it...
            }
            if(row.attack_multiplier >= 14 || row.defense_multiplier >= 14){
                attackLevel = 17; pillageLevel = 60;//if you addCommas(can afford it...
            }
            if(row.attack_multiplier >= 17 || row.defense_multiplier >= 17){
                attackLevel = 20; pillageLevel = 70;//if you can afford it...
            }
            var looseAttackers=Math.floor((row.attackers*row.attack_multiplier+row.defenders*row.defense_multiplier)*1.2/attackLevel+1);
            var needForMoney=Math.floor(looseAttackers+row.money/pillageLevel-row.defenders/16);
            var needForFuel=Math.floor(looseAttackers+row.fuel/pillageLevel-row.defenders/16);
            var tablerows=document.getElementById('browse_content').rows;
            var tr=null;
            for (var i=0;i<tablerows.length;i++)
                if (tablerows[i].cells[1].innerHTML==row.row_id)
                    tr=tablerows[i];
            if (!tr) continue;
            if(looseAttackers*20.0 < (row.money*1.0 + (row.defenders * 1.0 / 16 * 20))){
                tr.removeAttribute('class');
                var color='yellow';
                if(attackLevel >=  5) color='orange';
                if(attackLevel >=  8) color='red';
                if(attackLevel >= 11) color='violet';
                if(attackLevel >= 14) color='pink';
                if(attackLevel >= 17) color='0x99CCFF'; // light blue
                if(attackLevel >= 20) color='0xFFCCCC'; // random color

                tr.bgColor=color;
            }
            var moneylink=document.createElement('a');
            moneylink.innerHTML=needForMoney;moneylink.href='javascript:void(0)';
            moneylink.addEventListener('click',function(e){
                queueAttack((this.parentNode.parentNode.cells[1].innerHTML*1),(this.text*1),myrow.row_id);
            },true);
            var fuellink=document.createElement('a');
            fuellink.innerHTML=needForFuel;fuellink.href='javascript:void(0)';
            fuellink.addEventListener('click',function(e){
                queueAttack((this.parentNode.parentNode.cells[1].innerHTML*1),(this.text*1),myrow.row_id);
            },true);
            tr.cells[4].appendChild(document.createTextNode(" "));tr.cells[4].appendChild(moneylink);
            tr.cells[6].appendChild(document.createTextNode(" "));tr.cells[6].appendChild(fuellink);
        }
    }
    rows=nrs;
    if (huntmode)
        hunt();
}


