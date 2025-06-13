const request_btn = document.querySelector("input[type=submit]");
const email = document.querySelector("input[type=email]");

const card = document.querySelector(".card");


request_btn.addEventListener("click", (e)=>{
  e.preventDefault();
  card.innerHTML = "<h3>Please wait...</h3>";
  fetch('/mail', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: email.value
    })
  })
  .then(res => res.text())
  .then(data => {
    card.innerHTML = "<h3>We have just sent you an email with link to get you onboard</h3><h4>Please check your Inbox</h4>";
  })
  .catch(err => {
    alert(err);
  })
  
  
})