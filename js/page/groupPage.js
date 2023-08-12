/**

RoPro (https://ropro.io) v1.2

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


var groupId = 0;
var userRoles = {};

function fetchDiscordID(discordUrl) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetURL", url:"https://api.ropro.io/getDiscordID.php?link=" + stripTags(discordUrl)}, 
			function(data) {
				resolve(data)
		})
	})
}

function fetchUserRoles(groupId) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetURL", url:"https://groups.roblox.com/v2/groups/" + groupId + "/wall/posts?sortOrder=Desc&limit=100"}, 
			function(data) {
				resolve(data)
		})
	})
}

function fetchSetting(setting) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetSetting", setting: setting}, 
			function(data) {
				resolve(data)
			}
		)
	})
}

function stripTags(s) {
	if (typeof s == "undefined") {
		return s
	}
	return s.replace(/(<([^>]+)>)/gi, "").replace(/</g, "").replace(/>/g, "").replace(/'/g, "").replace(/"/g, "").replace(/`/g, "");
 }

async function addEmbeds(sectionContent) {
	/**if (document.getElementsByClassName('social-link-icon Discord').length > 0 && await fetchSetting("groupDiscord")) {
		discordUrl = document.getElementsByClassName('social-link-icon Discord')[0].parentNode.href
		discordID = await fetchDiscordID(discordUrl)
		if (isNormalInteger(discordID)) {
			div = document.createElement('div')
			discordFrameHTML = `<iframe src="https://discordapp.com/widget?id=${stripTags(discordID)}&amp;theme=dark" width="300" height="500" allowtransparency="true" frameborder="0" style="position:absolute;right:-310px;top:0px;" sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"></iframe>`
			div.innerHTML = discordFrameHTML
			sectionContent.appendChild(div)
		}
	}**/
	if (document.getElementsByClassName('social-link-icon Twitter').length > 0 && await fetchSetting("groupTwitter")) {
		twitterUrl = document.getElementsByClassName('social-link-icon Twitter')[0].parentNode.href
		twitterProfile = twitterUrl.split('twitter.com/')[1]
		div = document.createElement('div')
		twitterFrameHTML = `<iframe src="https://ropro.io/twitterFrame.php?account=${stripTags(twitterProfile)}" width="342" height="1000" allowtransparency="true" frameborder="0" style="position:absolute;right:-333px;top:0px;" sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"></iframe>`
		div.innerHTML = twitterFrameHTML
		sectionContent.appendChild(div)
	}
}

function isNormalInteger(str) {
    return /^\+?(0|[1-9]\d*)$/.test(str);
}

async function checkGroupPage() {
	groupSplit = window.location.href.split("groups/")[1]
	if (typeof groupSplit != 'undefined') {
		groupId = groupSplit.split("/")[0]
		if (isNormalInteger(groupId)) { // Valid Group Page
			groupDetails = document.getElementsByClassName('group-details')[0]
			if (typeof groupDetails != 'undefined') {
				setTimeout(async function(){
					sectionContent = groupDetails.getElementsByClassName('section-content')[0]
					sectionContent.style.position = "relative"
					addEmbeds(sectionContent)
				}, 1000)
			} else {
				setTimeout(function() {
					checkGroupPage()
				}, 500)
			}
		}
	}
}
checkGroupPage()