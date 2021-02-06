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

function changeUserStatus(button){
  var xhttp = new XMLHttpRequest();
  xhttp.onload = function(){
    parseResponse(this.responseText, 'users');
    requestUsers();
  };
  var user = button.getAttribute('user');
  var status = button.getAttribute('status');
  xhttp.open("GET", "/users/status/"+user+"/"+status, true);
  xhttp.send();
}

function resendUserInvite(button){
  var xhttp = new XMLHttpRequest();
  xhttp.onload = function() {
    parseResponse(this.responseText, 'users');
  }
  var user = button.getAttribute('user');
  xhttp.open("GET", "/users/resend/"+user, true);
  xhttp.send();
}

function createUser(){
  $('.alert').alert('close');
  var xhttp = new XMLHttpRequest();
  var url = '/users/create';
  var data = {'user_invite': document.getElementById('user_invite').value};
  xhttp.open('POST', url, true);

  xhttp.setRequestHeader('Content-type', 'application/json');
  xhttp.onload = function() {
    parseResponse(this.responseText, 'users', function(response){
      requestUsers();
    });
  }
  xhttp.send(JSON.stringify(data));
  return false;
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