function changePassword(){
  $('.alert').alert('close');
  var xhttp = new XMLHttpRequest();
  var url = '/changepassword';
  var data = {'password': document.getElementById('password').value, 'newpass': document.getElementById('newpass').value, 'passconf': document.getElementById('passconf').value};
  xhttp.open('POST', url, true);

  xhttp.setRequestHeader('Content-type', 'application/json');
  xhttp.onload = function() {
    parseResponse(this.responseText, 'account', function(response){
      requestOrgs();
    });
  }
  xhttp.send(JSON.stringify(data));
  return false;
}