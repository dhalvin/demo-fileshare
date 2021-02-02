window.addEventListener("DOMContentLoaded",
  function(){
    $("[data-toggle='tooltip']").tooltip();
  });

function createAlert(type, msg, containerId){
  var err = document.createElement('div');
  err.className = 'alert alert-'+type+' alert-dismissible fade show';
  err.setAttribute('role', 'alert');
  err.innerText = msg;
  var dismiss = document.createElement('button');
  dismiss.className = 'close';
  dismiss.setAttribute('type', 'button');
  dismiss.setAttribute('data-dismiss', 'alert');
  dismiss.setAttribute('aria-label', 'Close');
  dismiss.innerHTML = '<span aria-hidden="true">&times;</span>';
  err.appendChild(dismiss);
  var container = document.getElementById(containerId);
  container.insertBefore(err, container.childNodes[0]);
}

function parseResponse(reponseText, successCallback=function(){}, failCallback=function(){}){
  var response = JSON.parse(responseText);
  if(response.errors){
    for(err of response.errors){
      createAlert('danger', err.msg, 'orgs');
    }
    return failCallback(response);
  }
  else{
    if(response.data.success){
      createAlert('success', response.data.success, 'orgs');
    }
    return successCallback(response);
  }
}