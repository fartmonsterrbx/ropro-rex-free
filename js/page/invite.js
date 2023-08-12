/**

RoPro (https://ropro.io) v1.5

The RoPro extension is developed by:
                               
,------.  ,--. ,-----.,------. 
|  .-.  \ |  |'  .--./|  .---' 
|  |  \  :|  ||  |    |  `--,  
|  '--'  /|  |'  '--'\|  `---. 
`-------' `--' `-----'`------' 
                            
Contact me:

Discord - Dice#1000
Email - dice@ropro.io
Phone - 650-318-1631

Write RoPro:

RoPro Software Corporation
999 Peachtree Street NE
Suite 400
Atlanta, GA 30309
United States

RoPro Terms of Service:
https://ropro.io/terms

RoPro Privacy Policy:
https://ropro.io/privacy-policy

© 2022 RoPro Software Corporation
**/

div = document.createElement('div')
div.classList.add('ropro-valid')
document.body.appendChild(div)

function openInvite(placeid, key) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "CreateInviteTab", placeid: placeid, key: key}, 
			function(data) {
				resolve(data)
			}
		)
	})
}

$(document).ready(async function(){
	key = document.getElementById('invite_key').getAttribute('value').substring(0, 6)
	placeid = parseInt(document.getElementById('invite_placeid').getAttribute('value'))
	tab = await openInvite(placeid, key)
	document.getElementById('loadingText').innerHTML = "Server loaded. Have fun!"
	document.getElementById('connectingSpinner').style.display = "none"
	document.getElementById('leaveReview').style.display = "block"
});