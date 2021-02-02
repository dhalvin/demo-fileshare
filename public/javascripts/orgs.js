function requestOrgs(){
  var xhttp = new XMLHttpRequest();
  xhttp.onload = function(){
    document.getElementById('manageOrgs').innerHTML = this.responseText;
  };
  xhttp.open("GET", "/orgs", true);
  xhttp.send();
}

function changeOrgStatus(button){
  var xhttp = new XMLHttpRequest();
  xhttp.onload = function(){
    requestOrgs();
  };
  var org = button.getAttribute('org');
  var status = button.getAttribute('status');
  xhttp.open("GET", "/orgs/status/"+org+"/"+status, true);
  xhttp.send();
}
  
window.addEventListener("DOMContentLoaded",
  function(){
    requestOrgs();
  }
);