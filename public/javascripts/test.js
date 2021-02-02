function testAjax(){
  var xhttp = new XMLHttpRequest();
  xhttp.onload = function(){
    document.getElementById('ajax-data').innerText = this.responseText;
  }
  xhttp.open("GET", "/files/test", true);
  xhttp.send();
}