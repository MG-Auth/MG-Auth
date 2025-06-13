const request_btn = document.querySelector("input[type=submit]");
const email = document.querySelector("input[type=email]");

const card = document.querySelector(".card");


request_btn.addEventListener("click", (e)=>{
  e.preventDefault();
  card.innerHTML = "<h3>Please wait...</h3>";
  
  // Get brand data if available
  const brandData = window.brandData || null;
  
  const requestBody = {
    email: email.value
  };
  
  // Add brand data if available
  if (brandData) {
    requestBody.brandData = brandData;
    requestBody.redirect_url = brandData.redirect;
  }
  
  fetch('/mail', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  })
  .then(res => res.text())
  .then(data => {
    card.innerHTML = "<h3>We have just sent you an email with link to get you onboard</h3><h4>Please check your Inbox</h4>";
  })
  .catch(err => {
    alert(err);
  })
  
  
})