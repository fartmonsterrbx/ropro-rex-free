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

function addThemesButton() {
	var detailsAction = document.getElementsByClassName('details-actions desktop-action')
	if (detailsAction.length == 0) {
		div = document.createElement('div')
		div.innerHTML += `<ul class="details-actions desktop-action"></ul>`
		detailsAction = div.childNodes[0]
		document.getElementsByClassName('header-details')[0].appendChild(detailsAction)
	} else {
		detailsAction = detailsAction[0]
	}
	detailsAction.innerHTML += `<li><a href="/themes"><button id="editThemes" class="btn-control-md">Edit Theme</button></a></li>`
}

function getIdFromURL(url) {
	return parseInt(url.split("users/")[1].split("/profile")[0])
}

async function themesMain(){
	myUserID = await getStorage("rpUserID")
	pageID = getIdFromURL(location.href)
	if (myUserID == pageID && await fetchSetting('profileThemes')) {
		addThemesButton()
	}
}

themesMain()