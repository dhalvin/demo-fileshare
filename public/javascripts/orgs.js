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

function createOrg(){
  $('.alert').alert('close');
  var xhttp = new XMLHttpRequest();
  var url = '/orgs/create';
  var data = {'org_name': document.getElementById('org_name').value, 'org_email': document.getElementById('org_email').value};
  xhttp.open('POST', url, true);

  xhttp.setRequestHeader('Content-type', 'application/json');
  xhttp.onload = function() {
    var response = JSON.parse(this.responseText);
    if(response.errors){
      for(err of response.errors){
        createAlert('danger', err.msg, 'orgs');
      }
    }
    else{
      if(response.data.success){
        createAlert('success', response.data.success, 'orgs');
      }
      requestOrgs();
    }
  }
  xhttp.send(JSON.stringify(data));
  return false;
}
  
window.addEventListener("DOMContentLoaded",
  function(){
    requestOrgs();
  }
);