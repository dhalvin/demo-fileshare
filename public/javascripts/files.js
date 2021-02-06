function resetModal(){
  return new Promise(function (resolve, reject) {
    var xhttp = new XMLHttpRequest();
    xhttp.onload = function(){
      this;
      console.log('test');
      document.getElementById('uploadModal').innerHTML = this.responseText;
      resolve();
    };
    xhttp.open("GET", "/files/modal", true);
    xhttp.send();
  });
}

function requestFiles(button){
  var xhttp = new XMLHttpRequest();
  xhttp.onload = function(){
    document.getElementById('filesBrowse').innerHTML = this.responseText;
  };
  var route = button.getAttribute('prefix');
  xhttp.open("GET", "/files/"+route, true);
  xhttp.send();
}

async function startUploadFiles(event){
  event.preventDefault();
  $('.alert').alert('close');
  var currentPath = document.querySelector('.breadcrumb[currentPath]').getAttribute('currentPath');
  if(!currentPath){
    createAlert('danger', 'You cannot upload to this directory.', 'files');
    return false;
  }
  await resetModal();
  var files = document.getElementById('fileInput').files;
  var firstRow = document.querySelector(".uploadRow[rowNum='0']");
  for(var i = 0; i < files.length; i++){
    if(i > 0){
      var newRow = firstRow.cloneNode(true);
      newRow.setAttribute('rowNum', i);
      document.getElementById('uploadBody').appendChild(newRow);
    }
    document.querySelector(".uploadRow[rowNum='"+i+"']").setAttribute('fileName', files[i].name);
    document.querySelector(".uploadRow[rowNum='"+i+"'] > .fileName").innerText = files[i].name;
    document.querySelector(".uploadRow[rowNum='"+i+"'] > .fileSize").innerText = Math.round(100*files[i].size/1024)/100 + " KB";
    var progressBar = document.querySelector(".uploadRow[rowNum='"+i+"'] .progress-bar");
  }
  document.getElementById('uploadModalLabel').innerText = 'Upload files to: ' + currentPath + '?';
  $('#uploadModal').modal('show');
  return false;
}

function confirmUpload(){
  document.getElementById('confirmBtn').setAttribute('disabled', 'disabled');
  document.getElementById('uploadModalLabel').innerText = 'Uploading... Please Wait';
  var currentPath = document.querySelector('.breadcrumb[currentPath]').getAttribute('currentPath');
  var formData = new FormData();
  var files = document.getElementById('fileInput').files;
  if(files.length < 1){
    createAlert('danger', 'Please select at least 1 file', 'files');
    return false;
  }
  for(file of files){
    var progressBar = document.querySelector(".uploadRow[fileName='"+file.name+"'] .progress-bar").classList.add('progress-bar-animated');
    formData.append('files', file);
  }
  var xhttp = new XMLHttpRequest();
  xhttp.onload = function(){
    var response = parseResponse(this.responseText, 'files');
    for(file of response.data.files){
      var progressBar = document.querySelector(".uploadRow[fileName='"+file.name+"'] .progress-bar");
      progressBar.classList.remove('progress-bar-striped');
      progressBar.classList.remove('progress-bar-animated');
      if(file.status == "ok"){
        progressBar.classList.add('bg-success');
        progressBar.innerText = 'OK';
      }
      else{
        progressBar.classList.add('bg-danger');
        progressBar.innerText = 'ERROR';
      }
    }
    document.getElementById('confirmBtn').style.display = 'none';
    document.getElementById('dismissBtn').style.display = 'block';
    document.getElementById('uploadModalLabel').innerText = 'Upload Complete';
    requestFiles({getAttribute: function(){return currentPath}});
  };

  xhttp.open("POST", "/files/upload/"+currentPath, true);
  xhttp.send(formData);
}

function cancelUpload(){

}

function dismissModal(){
  $('#uploadModal').modal('hide');
}

function updateFileInputLabel(){
  var selectedFiles = '';
  var files = document.getElementById('fileInput').files;
  if(files.length > 0){
    for(var i = 0; i < files.length; i++){
      selectedFiles += files[i].name + '; ';
    }
  }
  else{
    selectedFiles = 'Select file(s) to upload';
  }
  document.getElementById('fileInputLabel').innerText = selectedFiles;
}

window.addEventListener("DOMContentLoaded",
  function(){
    requestFiles({getAttribute: function(){return ''}});
    document.getElementById('fileInput').addEventListener('change', updateFileInputLabel);
    document.getElementById('fileInput').addEventListener('invalid', function(){
      createAlert('danger', 'Select a file', 'files');
    });
    document.getElementById('uploadForm').addEventListener('submit', startUploadFiles);
  });