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
    parseResponse(this.responseText, 'orgs');
    requestOrgs();
  };
  var org = button.getAttribute('org');
  var status = button.getAttribute('status');
  xhttp.open("GET", "/orgs/status/"+org+"/"+status, true);
  xhttp.send();
}

function resendOrgInvite(button){
  var xhttp = new XMLHttpRequest();
  xhttp.onload = function() {
    parseResponse(this.responseText, 'orgs');
  }
  var org = button.getAttribute('org');
  xhttp.open("GET", "/orgs/resend/"+org, true);
  xhttp.send();
}

function createOrg(){
  $('.alert').alert('close');
  var xhttp = new XMLHttpRequest();
  var url = '/orgs/create';
  var data = {'org_name': document.getElementById('org_name').value, 'org_email': document.getElementById('org_email').value};
  xhttp.open('POST', url, true);

  xhttp.setRequestHeader('Content-type', 'application/json');
  xhttp.onload = function() {
    parseResponse(this.responseText, 'orgs', function(response){
      requestOrgs();
    });
  }
  xhttp.send(JSON.stringify(data));
  return false;
}
  
window.addEventListener("DOMContentLoaded",
  function(){
    requestOrgs();
  }
);