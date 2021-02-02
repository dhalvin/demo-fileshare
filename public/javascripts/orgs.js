function requestOrgs(){
    var xhttp = new XMLHttpRequest();
    xhttp.onload = function(){
      document.getElementById('manageOrgs').innerHTML = this.responseText;
    };
    xhttp.open("GET", "/orgs", true);
    xhttp.send();
  }
  
window.addEventListener("DOMContentLoaded",
  function(){
    requestOrgs();
  });