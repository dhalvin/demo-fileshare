function requestUsers(){
  var xhttp = new XMLHttpRequest();
  xhttp.onload = function(){
    document.getElementById('manageUsers').innerHTML = this.responseText;
  };
  xhttp.open("GET", "/users", true);
  xhttp.send();
}

function requestRegCode(){
  var xhttp = new XMLHttpRequest();
  xhttp.onload = function(){
    var res = JSON.parse(this.responseText);
    document.getElementById('regcode').value = res.data.regcode;
    expireTime = res.data.regexpire;
  };
  xhttp.open("GET", "/regcode", true);
  xhttp.send();
}

function updateExpireTime(){
  let diff = new Date(expireTime - Date.now());
  if(diff.getTime() > 0){
    document.getElementById('expireTime').innerText = diff.getUTCHours() + ":" + diff.getUTCMinutes() +  ":" + diff.getUTCSeconds();
  }
  else{
    document.getElementById('expireTime').innerHTML = '<strong style="color:red;">EXPIRED</strong>';
  }
  setTimeout(updateExpireTime, 1000);
}

window.addEventListener("DOMContentLoaded",
  function(){
    requestUsers();
    updateExpireTime();
  });