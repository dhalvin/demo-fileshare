function requestFiles(button){
  var xhttp = new XMLHttpRequest();
  xhttp.onload = function(){
    document.getElementById('files').innerHTML = this.responseText;
  };
  var route = button.getAttribute('prefix');
  xhttp.open("GET", "/files/"+route, true);
  xhttp.send();
}

window.addEventListener("DOMContentLoaded",
  function(){
    requestFiles({getAttribute: function(){return ''}});
  });