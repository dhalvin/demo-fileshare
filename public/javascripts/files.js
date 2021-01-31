function requestFiles(button){
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function(){
    document.getElementById('files').innerHTML = this.responseText;
  };
  var route = button.getAttribute('prefix');
  xhttp.open("GET", "/files/"+route, true);
  xhttp.send();
}

function requestUsers(){
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function(){
    document.getElementById('manageUsers').innerHTML = this.responseText;
  };
  xhttp.open("GET", "/users", true);
  xhttp.send();
}

function requestRegCode(){
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function(){
    var res = JSON.parse(this.responseText);
    document.getElementById('regcode').value = res.data.regcode;
    expireTime = res.data.regexpire;
  };
  xhttp.open("GET", "/regcode", true);
  xhttp.send();
}

window.addEventListener("DOMContentLoaded",
  function(){
    requestFiles({getAttribute: function(){return ''}});
    requestUsers();
    $("[data-toggle='tooltip']").tooltip();
    updateExpireTime();
  });

function updateExpireTime(){
  let diff = new Date(expireTime - Date.now());
  //document.getElementById('expireTime').innerText = diff.getHours() + " Hours, " + diff.getMinutes() +  " Minutes, " + diff.getSeconds() +  " Seconds";
  document.getElementById('expireTime').innerText = diff.getHours() + ":" + diff.getMinutes() +  ":" + diff.getSeconds();
  setTimeout(updateExpireTime, 1000);
}