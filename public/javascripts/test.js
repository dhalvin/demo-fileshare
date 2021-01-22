alert('test');
function testAjax(){
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function(){
    document.getElementById('ajax-data').innerText = this.responseText;
  }
  xhttp.open("GET", "/files/test", true);
  xhttp.send();
}