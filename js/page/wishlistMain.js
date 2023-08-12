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



var wishlistHTML = `<div style="position:relative;background:none;" class="container-header content">
      <h1>RoPro ${chrome.i18n.getMessage("TradeOffers")} <img class="offers-icon-big" style="height:30px;margin-bottom:5px;margin-left:5px;" src="${chrome.runtime.getURL('/images/offers_icon.svg')}"></h1>
	  <button id="createOfferButton" type="button" class="btn-fixed-width-lg btn-growth-lg" style="margin-top:-40px;background-color:#0084dd;border:0px;font-size:18px;padding:5px;float:right;">${chrome.i18n.getMessage("CreateOffer")}</button>
	  <button id="refreshOffers" type="button" class="btn-fixed-width-lg btn-growth-lg" style="margin-right:200px;margin-top:-40px;background-color:lime green;border:0px;font-size:18px;padding:5px;float:right;">Refresh Offers</button>
	  <span id="offersLoading" style="width: 100px; height: 15px; float:right;display:none;position:absolute;top:14px;right:380px;" class="spinner spinner-default"></span>
	</div>
   <resellers-pane class="ng-isolate-scope">
		<ul style="border:none;" id="wishlistOffers" class="vlist">
			
		</ul>
		<div id="seemore_wishlist" style="display:none;" class="ajax-comments-more-button-container" itemid="387256603" page="0">
                <button type="button" style="width:1100px;" class="btn-control-sm rbx-comments-see-more">${chrome.i18n.getMessage("SeeMore")}</button>
            </div>
   </resellers-pane>`
var myInventory = -1
var myInventoryItemInfo = {}
var catalogItemInfo = {}
var offerBuilderRap = 0
var offerBuilderValue = 0
var offerBuilderWantRap = 0
var offerBuilderWantValue = 0
var loadingOffers = false

function fetchWishlist(page) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetURL", url:"https://api.ropro.io/getWishlistAll.php?page=" + page}, 
			function(data) {
				resolve(data)
			}
		)
	})
}

function fetchStatusCode(url) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetStatusCode", url: url}, 
			function(data) {
				resolve(data)
			}
		)
	})
}

function fetchCanTrade(userID) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetURL", url:"https://trades.roblox.com/v1/users/" + userID + "/can-trade-with"}, 
			function(data) {
				resolve(data['canTrade'])
			}
		)
	})
}

function fetchItems(search) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetURL", url:"https://catalog.roblox.com/v1/search/items?Category=2&Subcategory=2&SortType=1&SortAggregation=5&limit=10&keyword="+search}, 
			function(data) {
				resolve(data)
			}
		)
	})
}

function fetchPremium(userID) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetURL", url:"https://premiumfeatures.roblox.com/v1/users/" + userID + "/validate-membership"}, 
			function(data) {
				resolve(data)
			}
		)
	})
}

function fetchItemInfo(items) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetURL", url:"https://api.ropro.io/itemInfo.php?ids=" + items.join(",")}, 
			function(data) {
				resolve(data)
			}
		)
	})
}

function fetchDetails(items) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "PostValidatedURL", url:"https://catalog.roblox.com/v1/catalog/items/details", jsonData: JSON.stringify(items)}, 
			function(data) {
					resolve(data)
			})
	})
}

function deleteOffer(wishid) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetURL", url:"https://api.ropro.io/deleteWish.php?wishid=" + wishid}, 
			function(data) {
				resolve(data)
			}
		)
	})
}

function fetchItemMiniSearch(search) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetURL", url:"https://api.ropro.io/itemSearch.php?q="+search},
			function(data) {
				resolve(data)
			}
		)
	})
}

function fetchInventory(userID) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetUserInventory", userID: userID}, 
			function(data) {
				resolve(data)
			}
		)
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

function loadPlayerThumbnails(userIds) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetURL", url:"https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=" + userIds.join() + "&size=420x420&format=Png&isCircular=false"}, 
			function(data) {
				for (var i = 0; i < data.data.length; i++) {
					 $('.ropro-player-thumbnail-' + data.data[i].targetId).attr("src", stripTags(data.data[i].imageUrl))
				}
			}
		)
	})
}

function getAssetThumbnail(id) {
	return new Promise(resolve => {
		if (id <= 0) {
			resolve(chrome.runtime.getURL('/images/empty.png'))
		}
		chrome.runtime.sendMessage({greeting: "GetURLCached", url:"https://api.ropro.io/getAssetThumbnailUrl.php?id=" + parseInt(id)}, 
			function(data) {
					resolve(data)
			})
	})
}

var thumbnailCache = {}

function setAssetThumbnail(id) {
	if (id <= 0) {
		return
	}
	if (id in thumbnailCache) {
		$('.ropro-image-' + parseInt(id)).attr("src", stripTags(thumbnailCache[id]))
		return thumbnailCache[id]
	}
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetURLCached", url:"https://api.ropro.io/getAssetThumbnailUrl.php?id=" + parseInt(id)}, 
			function(data) {
					thumbnailCache[id] = data
					resolve(data)
					$('.ropro-image-' + parseInt(id)).attr("src", stripTags(data))
			})
	})
}

function addCommas(nStr){
	nStr += '';
	var x = nStr.split('.');
	var x1 = x[0];
	var x2 = x.length > 1 ? '.' + x[1] : '';
	var rgx = /(\d+)(\d{3})/;
	while (rgx.test(x1)) {
		x1 = x1.replace(rgx, '$1' + ',' + '$2');
	}
	return x1 + x2;
}

function checkVerification() {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "CheckVerification"}, 
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

async function postOffer() {
	if (await checkVerification()) {
		offerEditor = document.getElementById('offerEditor')
		containers = [document.getElementById('itemContainer1'), document.getElementById('itemContainer2'), document.getElementById('itemContainer3'), document.getElementById('itemContainer4')]
		wantContainer = document.getElementById('itemContainer5')
		wantContainer2 = document.getElementById('itemContainer6')
		wantContainer3 = document.getElementById('itemContainer7')
		wantContainer4 = document.getElementById('itemContainer8')
		userID = await getStorage('rpUserID')
		json = {userid: userID, want_item: wantContainer.getAttribute("itemid"), want_item2: wantContainer2.getAttribute("itemid"), want_item3: wantContainer3.getAttribute("itemid"), want_item4: wantContainer4.getAttribute("itemid"), want_value: 0, item1: containers[0].getAttribute("itemid"), item2: containers[1].getAttribute("itemid"), item3: containers[2].getAttribute("itemid"), item4: containers[3].getAttribute("itemid"), note: ''}
		premium = await fetchPremium(userID)
		if (premium == false) {
			alert("You must have Roblox Premium to trade or post RoPro trade offers.")
		} else {
			return new Promise(resolve => {
				chrome.runtime.sendMessage({greeting: "PostURL", url:"https://api.ropro.io/postWishlist.php", jsonData: json}, 
				function(data) {
					response = JSON.parse(data)
					if ('error' in response) { // Wishlist post errored
						alert(response['error'])
					} else { // Successfully posted wishlist
						refreshWishlist()
						document.getElementById('offerEditor').remove()
						createOfferButton.innerHTML = chrome.i18n.getMessage("CreateOffer")
						document.getElementById("seemore_wishlist").setAttribute("page", 0)
					}
					resolve(data)
				})
			})
		}			
	} else {
		alert("You must verify your user with RoPro at roblox.com/home before posting trade offers.")
	}
}

function refreshWishlist() {
	seeMoreWishlist = document.getElementById("seemore_wishlist")
	$(".offerlist_item").remove()
	getWishes(0)
}

function getStorage(key) {
	return new Promise(resolve => {
		chrome.storage.sync.get(key, function (obj) {
			resolve(obj[key])
		})
	})
}

async function getUsername(userId) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetURL", url:"https://api.roblox.com/users/" + userId}, 
			function(data) {
				resolve(data)
			}
		)
	})
}
 
function insertAfter(newNode, existingNode) {
    existingNode.parentNode.insertBefore(newNode, existingNode.nextSibling);
}

function kFormatter(num) {
    return Math.abs(num) > 999 ? Math.abs(num) > 999999 ? Math.sign(num)*((Math.abs(num)/1000000).toFixed(1)) + 'm' : Math.sign(num)*((Math.abs(num)/1000).toFixed(1)) + 'k' : Math.sign(num)*Math.abs(num)
}

function timeSince(date) {

  var seconds = Math.floor((new Date() - date) / 1000);

  var interval = seconds / 31536000;

  if (interval > 1) {
	if (Math.floor(interval) > 1) {
		return Math.floor(interval) + " years";
	} else {
		return Math.floor(interval) + " year";
	}
  }
  interval = seconds / 2592000;
  if (interval > 1) {
	if (Math.floor(interval) > 1) {
		return Math.floor(interval) + " months";
	} else {
		return Math.floor(interval) + " month";
	}
  }
  interval = seconds / 86400;
  if (interval > 1) {
	if (Math.floor(interval) > 1) {
		return Math.floor(interval) + " days";
	} else {
		return Math.floor(interval) + " day";
	}
  }
  interval = seconds / 3600;
  if (interval > 1) {
	if (Math.floor(interval) > 1) {
		return Math.floor(interval) + " hours";
	} else {
		return Math.floor(interval) + " hour";
	}
  }
  interval = seconds / 60;
  if (interval > 1) {
	if (Math.floor(interval) > 1) {
		return Math.floor(interval) + " minutes";
	} else {
		return Math.floor(interval) + " minute";
	}
  }
  if (Math.floor(seconds) > 1) {
	return Math.floor(seconds) + " seconds";
  } else {
    return Math.floor(seconds) + " second";
  }
}

function createValue(value) {
itemElement = document.createElement('thumbnail-2d')
itemElement.setAttribute("class", "item-card-thumb-container ng-isolate-scope")
itemElement.setAttribute("style", "transform:scale(0.6);margin:-20px;display:inline-block;")
itemHTML = `
<div style="position:relative;">
	<span style="width:126px;height:126px;" class="thumbnail-2d-container">
	<p value="${parseInt(value)}" class="wantvalue ng-scope ng-isolate-scope" style="font-weight:bold;font-size:25px;margin-top:25px;text-align:center;class=" ng-scope="">+${stripTags(kFormatter(value))}<br>Value</p>
	</span>
</div>
`
itemElement.innerHTML += itemHTML
return itemElement
}


function createItem(item, index, noValue) {
	shift = ""
	id = item['id']
	console.log(item)
	itemElement = document.createElement('div')
	itemElement.setAttribute("class", "wishitemimage")
	itemElement.setAttribute("style", "position:relative;" + shift)
	href = ""
	if (id == -1) {
		src = chrome.runtime.getURL('/images/empty.png')
		tooltip = ""
		name = ""
		rap = "-1"
		value = "-1"
	} else if (id > -9 && id < -1) {
		icons = {2: chrome.runtime.getURL('/images/Demand_Dark.svg'), 3: chrome.runtime.getURL('/images/Rares_Dark.svg'), 4: chrome.runtime.getURL('/images/Upgrade_Dark.svg'), 5: chrome.runtime.getURL('/images/Downgrade_Dark.svg'), 6: chrome.runtime.getURL('/images/Robux_Dark.svg'), 7: chrome.runtime.getURL('/images/RAP_Dark.svg'), 8: chrome.runtime.getURL('/images/Any_Dark.svg')}
		names = {2: "Demand Items", 3: "Rare Items", 4: "Upgrades", 5: "Downgrades", 6: "Robux", 7: "RAP Items", 8: "Any Items"}
		src = icons[Math.abs(id)]
		name = names[Math.abs(id)]
		rap = "-1"
		value = "-1"
		height = 40
		top_px = -35
		tooltip = `
		<div class="offer-item-name input-group input-field" style="height:25px!important;top:-20px!important;"><a style="font-size:13px;font-weight:bold;">${stripTags(name)}</a>
		</div>
		`
	} else {
		name = item['name']
		rap = item['rap']
		value = item['value']
		if (value == -1) {
			height = 40
			top_px = -35
			valueText = ""
		} else {
			height = 60
			top_px = -55
			valueText = `<div style="margin-top:-5px;display: inline-block;">
			<img style="width:10px;" src="${chrome.runtime.getURL('/images/ropro_icon_small.png')}">
			<span style="font-size:12px;" class="rbx-text-navbar-right text-header">${addCommas(parseInt(value))}</span></div>`
			href=`href='https://www.roblox.com/catalog/${parseInt(id)}/Item'`
		}
		src = chrome.runtime.getURL('/images/empty.png')
		tooltip = `
		<div class="offer-item-name input-group input-field" style="height:${height}px!important;top:${top_px}px!important;"><a style="font-size:13px;font-weight:bold;" ${id > 0 ? `href="https://roblox.com/catalog/${parseInt(id)}/item"` : ''}>${stripTags(name)}</a>
		<br><div style="height:20px;margin-top:-5px;display: inline-block;">
		<span style="margin-left:-5px;margin-right:-8px;margin-bottom:0px;transform: scale(0.4);" id="nav-robux" class="icon-robux-28x28 roblox-popover-close"></span>
		<span style="font-size:12px;" class="rbx-text-navbar-right text-header">${addCommas(parseInt(rap))}</span></div>
		<br>
		${valueText}
		</div>
		`
	}
	itemHTML = `
	${tooltip}
	<thumbnail-2d id="${id}" rap="${rap}" value="${value}" class="offeritem item-card-thumb-container ng-isolate-scope" style="transform:scale(0.6);margin:-20px;display:inline-block;">
	<a ${href}>
		<span style="width:126px;height:126px;" class="thumbnail-2d-container">
		<img class="ropro-image-${parseInt(id)} ng-scope ng-isolate-scope ${(id > -9 && id < -1) ? "ropro-special-icon" : ""}" src="${src}"/>
		</span>
	</a>
	</thumbnail-2d>
	`
	itemElement.innerHTML += itemHTML
	return itemElement
}

function updateOfferBuilder() {
	editor = document.getElementById('offerEditor')
	if (!tradeOffersValueCalculator) {
		editor.getElementsByClassName('itemvalue')[0].style.display = "none";
		editor.getElementsByClassName('wantitemvalue')[0].style.display = "none";
	}
	editor.getElementsByClassName('itemrap')[0].getElementsByClassName('total-value')[0].innerHTML = offerBuilderRap <= 0 ? "---" : stripTags(addCommas(offerBuilderRap))
	editor.getElementsByClassName('itemvalue')[0].getElementsByClassName('total-value')[0].innerHTML = offerBuilderValue <= 0 ? "---" : stripTags(addCommas(offerBuilderValue))
	editor.getElementsByClassName('wantitemrap')[0].getElementsByClassName('total-value')[0].innerHTML = offerBuilderWantRap <= 0 ? "---" : stripTags(addCommas(offerBuilderWantRap))
	editor.getElementsByClassName('wantitemvalue')[0].getElementsByClassName('total-value')[0].innerHTML = offerBuilderWantValue <= 0 ? "---" : stripTags(addCommas(offerBuilderWantValue))
}

async function createOffer(myUser, userid, username, posted, note, wishid) {
offerElement = document.createElement('li')
offerElement.setAttribute("class", "reseller-item list-item offerlist_item")
offerElement.setAttribute("style", "margin-bottom:20px;")
offerElement.setAttribute("style", "margin-top:0px;padding-top:15px;padding-bottom:5px;")
note = stripTags(note)
console.log(myUser.toString() == userid)
if (myUser.toString() == userid) {
	tradeButton = `<button style="position:absolute;left:950px;top:40px;height:50px;transform:scale(1.2);" class="removebutton reseller-purchase-button btn-min-width btn-buy-md ng-binding" onclick="">Remove</button>`
} else {
	tradeButton = `<button style="position:absolute;left:950px;top:40px;height:50px;transform:scale(1.2);" tradesurl="https://www.roblox.com/users/${parseInt(userid)}/trade" class="trade-with-user reseller-purchase-button btn-min-width btn-buy-md ng-binding" onclick="if (this.getAttribute('trades-enabled') == null || this.getAttribute('trades-enabled') == 'true') { window.open('https://www.roblox.com/users/${parseInt(userid)}/trade', '_blank'); }">Trade</button>`
}
offerHTML = `
   <div style="position:relative;height:125px;" class="resale-info">
		  <a class="list-header reseller-item-avatar" ng-href="https://www.roblox.com/users/${parseInt(userid)}/profile" href="https://www.roblox.com/users/${parseInt(userid)}/profile">
			 <div style="margin:auto;margin-left:-10px!important;margin-right:10px!important;" class="user_div">
				<span>
					<img style="margin-left:10px!important;margin-right:10px!important;border-radius:50px;" class="user_image thumbnail-2d-container ropro-player-thumbnail-${parseInt(userid)}" width="100px" src="${chrome.runtime.getURL('/images/empty.png')}">
				</span>
				<span class="text-name user_caption caption">${stripTags(username)}</span>
				<span style="font-size:10px!important;margin-top:-10px;" class="user_caption caption">${timeSince(new Date(posted))} ago</span>
			 </div>
	   </a>
	   <div style="position:absolute;left:680px;bottom:0px;font-size:12px;" class="wantitemrap"><div style="display:inline-block;font-size:12px;margin-right:0px;"></div><div style="height:20px;margin-top:-5px;display: inline-block;">
	   <span style="margin-left:-5px;margin-right:-8px;margin-bottom:0px;transform: scale(0.4);" id="nav-robux" class="icon-robux-28x28 roblox-popover-close"></span>
	   <span style="font-size:12px;" class="rbx-text-navbar-right text-header total-value">---</span></div></div>
		<div style="position:absolute;left:285px;bottom:0px;font-size:12px;" class="itemrap"><div style="display:inline-block;font-size:12px;margin-right:0px;"></div><div style="height:20px;margin-top:-5px;display: inline-block;">
		<span style="margin-left:-5px;margin-right:-8px;margin-bottom:0px;transform: scale(0.4);" id="nav-robux" class="icon-robux-28x28 roblox-popover-close"></span>
		<span style="font-size:12px;" class="rbx-text-navbar-right text-header total-value">---</span></div></div>
		<div style="position:absolute;left:680px;bottom:-18px;font-size:12px;" class="wantitemvalue"><div style="margin-top:-5px;display: inline-block;">
		<img style="width:10px;margin-left:4px;" src="${chrome.runtime.getURL('/images/ropro_icon_small.png')}">
		<span style="font-size:12px;" class="rbx-text-navbar-right text-header total-value">---</span></div></div>
		<div style="position:absolute;left:285px;bottom:-18px;font-size:12px;" class="itemvalue"><div style="margin-top:-5px;display: inline-block;">
		<img style="width:10px;margin-left:4px;" src="${chrome.runtime.getURL('/images/ropro_icon_small.png')}">
		<span style="font-size:12px;" class="rbx-text-navbar-right text-header total-value">---</span></div></div>
	   <div style="position:absolute;left:150px;width:345px;">
		  <span style="text-align:center;display:block;" class="offering">Offering:</span>
	   </div>
	   <div style="margin-right:5px;" class="reseller-price-container"><div style="position:absolute;left:540px;top:0px;width:345px;">
		  <span style="text-align:center;display:block;" class="want">For:</span>
	   </div></div>
			${tradeButton}
   </div>
   `
offerElement.innerHTML += offerHTML
if (offerElement.getElementsByClassName('trade-with-user').length > 0) {
	tradeWithUser = offerElement.getElementsByClassName('trade-with-user')[0]
	tradeWithUser.addEventListener('mouseenter', async function() {
		if (this.getAttribute('trades-enabled') == null) {
			statusCode = await fetchStatusCode(this.getAttribute('tradesurl'))
			if (statusCode == 403 || statusCode == 404) {
				this.innerHTML += '<h5 class="disabled-trades" style="display:none;position:absolute;top:-40px;left:-70px;background-color:black;padding:5px;color:white;border-radius:10px;">Cannot Trade With User</h5>'
				this.setAttribute('trades-enabled', 'false')
			} else {
				this.setAttribute('trades-enabled', 'true')
			}
		}
	})
}
if (myUser.toString() == userid) {
	tradeButton = offerElement.getElementsByClassName('removebutton')[0]
	tradeButton.addEventListener("click", async function(){
		await deleteOffer(wishid)
		refreshWishlist()
	})
}
return offerElement
}

function addItem(container, secondary){
	itemID = parseInt(container.getAttribute("itemid"))
	itemImage = container.getElementsByTagName("img")[0]
	emptyImage = chrome.runtime.getURL('/images/empty.png')
	if (itemID == -1) {
		if (container.id != "itemContainer5" && container.id != "itemContainer6" && container.id != "itemContainer7" && container.id != "itemContainer8") {
			createInventory(container, secondary)
		} else {
			createCatalogSearch(container, secondary)
		}
	} else {
		itemImage.src = emptyImage
		if (container.id != "itemContainer5" && container.id != "itemContainer6" && container.id != "itemContainer7" && container.id != "itemContainer8") {
			offerBuilderRap -= myInventoryItemInfo[itemID]['rap']
			if (myInventoryItemInfo[itemID]['value'] != -1) {
				offerBuilderValue -= myInventoryItemInfo[itemID]['value']
			}
		} else {
			offerBuilderWantRap -= catalogItemInfo[itemID]['rap']
			if (catalogItemInfo[itemID]['value'] != -1) {
				offerBuilderWantValue -= catalogItemInfo[itemID]['value']
			}
		}
		updateOfferBuilder()
		container.setAttribute("itemid", -1)
	}
}

function hoverItem(container){
	itemID = parseInt(container.getAttribute("itemid"))
	itemImage = container.getElementsByTagName("img")[0]
	addImage = chrome.runtime.getURL('/images/add_button_small.png')
	closeImage = chrome.runtime.getURL('/images/close_button_small.png')
	if (itemID == -1) {
		itemImage.style.filter = ""
		itemImage.src = addImage
	} else {
		itemImage.style.filter = ""
		itemImage.src = closeImage
	}
}

async function leaveItem(container){
	icons = {2: chrome.runtime.getURL('/images/Demand_Dark.svg'), 3: chrome.runtime.getURL('/images/Rares_Dark.svg'), 4: chrome.runtime.getURL('/images/Upgrade_Dark.svg'), 5: chrome.runtime.getURL('/images/Downgrade_Dark.svg'), 6: chrome.runtime.getURL('/images/Robux_Dark.svg'), 7: chrome.runtime.getURL('/images/RAP_Dark.svg'), 8: chrome.runtime.getURL('/images/Any_Dark.svg')}
	itemID = parseInt(container.getAttribute("itemid"))
	itemImage = container.getElementsByTagName("img")[0]
	emptyImage = chrome.runtime.getURL('/images/empty.png')
	if (itemID == -1) {
		itemImage.src = emptyImage
	} else {
		if ($('.light-theme').length > 0 && itemID < -1) {
			itemImage.style.filter = "invert(1)"
		}
		if (itemID > -1) {
			itemImage.src = await getAssetThumbnail(itemID)
		} else {
			itemImage.src = icons[Math.abs(itemID)]
		}
	}
}

async function createOfferEditor() {
username = await getStorage("rpUsername")
userid = await getStorage("rpUserID")
offerBuilderRap = 0
offerBuilderValue = 0
offerBuilderWantRap = 0
offerBuilderWantValue = 0
offerElement = document.createElement('li')
offerElement.setAttribute("class", "reseller-item list-item")
offerElement.setAttribute("id", "offerEditor")
offerElement.setAttribute("style", "margin-bottom:20px;")
offerElement.setAttribute("style", "margin-top:0px;padding-top:5px;padding-bottom:5px;position:relative;border-top:none;")
offerHTML = `
   <a class="list-header reseller-item-avatar" ng-href="https://www.roblox.com/users/${parseInt(userid)}/profile" href="https://www.roblox.com/users/${parseInt(userid)}/profile">
         <div style="margin:auto;margin-left:-10px!important;margin-right:10px!important;" class="user_div">
			<span>
				<img style="margin-left:10px!important;margin-right:10px!important;border-radius:50px;" class="user_image thumbnail-2d-container ropro-player-thumbnail-${parseInt(userid)}" width="100px" src="${chrome.runtime.getURL('/images/empty.png')}">
			</span>
			<span class="text-name username user_caption caption">${stripTags(username)}</span>
			<span style="font-size:10px!important;margin-top:-10px;" class="user_caption caption">Building Offer</span>
		 </div>
   </a>
   <div style="position:absolute;left:285px;bottom:30px;font-size:12px;" class="itemrap"><div style="display:inline-block;font-size:12px;margin-right:0px;"></div><div style="height:20px;margin-top:-5px;display: inline-block;">
   <span style="margin-left:-5px;margin-right:-8px;margin-bottom:0px;transform: scale(0.4);" id="nav-robux" class="icon-robux-28x28 roblox-popover-close"></span>
   <span style="font-size:12px;" class="rbx-text-navbar-right text-header total-value">---</span></div></div>
   <div style="position:absolute;left:285px;bottom:12px;font-size:12px;" class="itemvalue"><div style="margin-top:-5px;display: inline-block;">
   <img style="width:10px;margin-left:4px;" src="${chrome.runtime.getURL('/images/ropro_icon_small.png')}">
   <span style="font-size:12px;" class="rbx-text-navbar-right text-header total-value">---</span></div></div>
   <div style="position:absolute;left:685px;bottom:30px;font-size:12px;" class="wantitemrap"><div style="display:inline-block;font-size:12px;margin-right:0px;"></div><div style="height:20px;margin-top:-5px;display: inline-block;">
	<span style="margin-left:-5px;margin-right:-8px;margin-bottom:0px;transform: scale(0.4);" id="nav-robux" class="icon-robux-28x28 roblox-popover-close"></span>
	<span style="font-size:12px;" class="rbx-text-navbar-right text-header total-value">---</span></div></div>
	<div style="position:absolute;left:685px;bottom:12px;font-size:12px;" class="wantitemvalue"><div style="margin-top:-5px;display: inline-block;">
	<img style="width:10px;margin-left:4px;" src="${chrome.runtime.getURL('/images/ropro_icon_small.png')}">
	<span style="font-size:12px;" class="rbx-text-navbar-right text-header total-value">---</span></div></div>
   <div style="margin-top:0px;" class="resale-info">
	   <div style="position:absolute;left:150px;width:345px;top:0px;">
		  <span style="text-align:center;display:block;" class="offering">Offering:</span>
			<thumbnail-2d class="item-card-thumb-container ng-isolate-scope" style="transform:scale(0.6);margin:-20px;display:inline-block;">
			<a itemid="-1" id="itemContainer1">
				<span style="width:126px;height:126px;" class="thumbnail-2d-container">
				<img class="ng-scope ng-isolate-scope" src="${chrome.runtime.getURL('/images/empty.png')}"/>
				</span>
			</a>
			</thumbnail-2d>
						<thumbnail-2d class="item-card-thumb-container ng-isolate-scope" style="transform:scale(0.6);margin:-20px;display:inline-block;">
			<a itemid="-1" id="itemContainer2">
				<span style="width:126px;height:126px;" class="thumbnail-2d-container">
				<img class="ng-scope ng-isolate-scope" src="${chrome.runtime.getURL('/images/empty.png')}"/>
				</span>
			</a>
			</thumbnail-2d>
						<thumbnail-2d class="item-card-thumb-container ng-isolate-scope" style="transform:scale(0.6);margin:-20px;display:inline-block;">
			<a itemid="-1" id="itemContainer3">
				<span style="width:126px;height:126px;" class="thumbnail-2d-container">
				<img class="ng-scope ng-isolate-scope" src="${chrome.runtime.getURL('/images/empty.png')}"/>
				</span>
			</a>
			</thumbnail-2d>
			<thumbnail-2d class="item-card-thumb-container ng-isolate-scope" style="transform:scale(0.6);margin:-20px;display:inline-block;">
			<a itemid="-1" id="itemContainer4">
				<span style="width:126px;height:126px;" class="thumbnail-2d-container">
				<img class="ng-scope ng-isolate-scope" src="${chrome.runtime.getURL('/images/empty.png')}"/>
				</span>
			</a>
			</thumbnail-2d>

	   </div>
	   <div style="margin-right:5px;" class="reseller-price-container"> 	   <div style="position:absolute;left:540px;top:0px;width:345px;">
		  <span style="text-align:center;display:block;" class="want">For:</span>
		  			<thumbnail-2d class="item-card-thumb-container ng-isolate-scope" style="transform:scale(0.6);margin:-20px;display:inline-block;">
			<a itemid="-1" id="itemContainer5">
				<span style="width:126px;height:126px;" class="thumbnail-2d-container">
				<img class="ng-scope ng-isolate-scope" src="${chrome.runtime.getURL('/images/empty.png')}"/>
				</span>
			</a>
			</thumbnail-2d>
			<thumbnail-2d class="item-card-thumb-container ng-isolate-scope" style="transform:scale(0.6);margin:-20px;display:inline-block;">
			<a itemid="-1" id="itemContainer6">
				<span style="width:126px;height:126px;" class="thumbnail-2d-container">
				<img class="ng-scope ng-isolate-scope" src="${chrome.runtime.getURL('/images/empty.png')}"/>
				</span>
			</a>
			</thumbnail-2d>
			<thumbnail-2d class="item-card-thumb-container ng-isolate-scope" style="transform:scale(0.6);margin:-20px;display:inline-block;">
			<a itemid="-1" id="itemContainer7">
				<span style="width:126px;height:126px;" class="thumbnail-2d-container">
				<img class="ng-scope ng-isolate-scope" src="${chrome.runtime.getURL('/images/empty.png')}"/>
				</span>
			</a>
			</thumbnail-2d>
			<thumbnail-2d class="item-card-thumb-container ng-isolate-scope" style="transform:scale(0.6);margin:-20px;display:inline-block;">
			<a itemid="-1" id="itemContainer8">
				<span style="width:126px;height:126px;" class="thumbnail-2d-container">
				<img class="ng-scope ng-isolate-scope" src="${chrome.runtime.getURL('/images/empty.png')}"/>
				</span>
			</a>
			</thumbnail-2d>
	   </div></div>
	      <button id="postOfferButton" style="background-color:#0084dd;position:absolute;left:950px;top:40px;height:50px;transform:scale(1.2);" class="reseller-purchase-button btn-min-width btn-buy-md ng-binding" onclick="">Post</button>
   </div>
   `
offerElement.innerHTML += offerHTML
return offerElement
}

function getItems() {
	containers = [document.getElementById('itemContainer1'), document.getElementById('itemContainer2'), document.getElementById('itemContainer3'), document.getElementById('itemContainer4')]
	items = []
	for (i = 0; i < containers.length; i++) {
		container = containers[i]
		itemID = parseInt(container.getAttribute('itemid'))
		if (itemID != -1) {
			items.push(itemID)
		}
	}
	return items
}

function insertItem(elem, secondary) {
	if (secondary) {
		containers = [document.getElementById('itemContainer5'), document.getElementById('itemContainer6'), document.getElementById('itemContainer7'), document.getElementById('itemContainer8')]
	} else {
		containers = [document.getElementById('itemContainer1'), document.getElementById('itemContainer2'), document.getElementById('itemContainer3'), document.getElementById('itemContainer4')]
	}
	inserted = false
	for (i = 0; i < containers.length; i++) {
		container = containers[i]
		if (container.getAttribute("itemid") == -1) {
			container.setAttribute("itemid", stripTags(elem.getAttribute("itemID").toString()))
			if (container.id != "itemContainer5" && container.id != "itemContainer6" && container.id != "itemContainer7" && container.id != "itemContainer8") {
				offerBuilderRap += myInventoryItemInfo[parseInt(elem.getAttribute("itemID"))]['rap']
				if (myInventoryItemInfo[parseInt(elem.getAttribute("itemID"))]['value'] != -1) {
					offerBuilderValue += myInventoryItemInfo[parseInt(elem.getAttribute("itemID"))]['value']
				}
			} else {
				offerBuilderWantRap += parseInt(elem.getAttribute("itemRAP"))
				if (parseInt(elem.getAttribute("itemValue")) != -1) {
					offerBuilderWantValue += parseInt(elem.getAttribute("itemValue"))
				}
			}
			updateOfferBuilder()
			leaveItem(container)
			inserted = true
			break
		}
	}
	if (inserted) {
		$("#inventorySelector").remove()
	}
}

function createInventoryItem(itemID, itemName, itemRAP, itemValue, itemQuantity, secondary) {
	li = document.createElement("li")
	li.setAttribute("style", "height:110px;position:relative;")
	margin = 17
	if (itemValue == -1) {
		valueString = ""
	} else {
		margin = 5
		valueString = `<br><span style="float:right;"><img style="width:10px;" src="${chrome.runtime.getURL('/images/ropro_icon_small.png')}"> ${stripTags(addCommas(itemValue))}</span>`
	}
	itemHTML = `<div class="section-content" style="padding:0px;width:260px;height:100px;position:absolute;left:5px;">
						<a href="https://www.roblox.com/catalog/${parseInt(itemID)}/Item">
							<img style="margin-left:10px;width:60px;float:left;" class="border-bottom ropro-image-${parseInt(itemID)}" src="${chrome.runtime.getURL('/images/empty.png')}"><div class="border-bottom" style="position:absolute;right:5px;"><div style="margin-top:${margin}px;font-size:13px;float:left;"><span style="float:right;">x ${parseInt(itemQuantity)}</span><br><span style="float:right;margin-top:-5px;margin-bottom:-5px;"><span style="margin-left:-5px;margin-right:-8px;margin-bottom:0px;transform: scale(0.4);" id="nav-robux" class="icon-robux-28x28 roblox-popover-close"></span> ${stripTags(addCommas(itemRAP))}</span>${valueString}</div><div style="float:right;">
						</a>
					<button type="button" class="btn-growth-lg createOfferButton" itemID="${parseInt(itemID)}" itemName="${stripTags(itemName)}" itemRAP="${parseInt(itemRAP)}" itemValue="${parseInt(itemValue)}" style="margin:5px;margin-left:10px;margin-top:15px;height:40px;width:40px;background-color:#0084DD;border:0px;font-size:30px;padding:5px;float:right;">+</button></div></div>
						<span style="" class="rbx-divider"></span>
					<div style="white-space:nowrap;overflow:hidden;width:260px;position:absolute;padding:15px;top:55px;right:5px;">
					<span>${stripTags(itemName)}
					</span>
						</div>
						</div>`
	li.innerHTML += itemHTML
	li.getElementsByClassName('createOfferButton')[0].addEventListener("click", function(){ insertItem(this, secondary) })
	return li
}

function createCatalogItem(itemID, itemName, itemRAP, itemValue, secondary) {
	li = document.createElement("li")
	li.setAttribute("style", "height:110px;position:relative;")
	margin = -5
	itemID = parseInt(itemID)
	itemName = stripTags(itemName)
	itemRAP = parseInt(itemRAP)
	itemValue = parseInt(itemValue)
	catalogItemInfo[parseInt(itemID)] = {"rap": parseInt(itemRAP), "value": parseInt(itemValue)}
	icons = {2: chrome.runtime.getURL('/images/Demand_Dark.svg'), 3: chrome.runtime.getURL('/images/Rares_Dark.svg'), 4: chrome.runtime.getURL('/images/Upgrade_Dark.svg'), 5: chrome.runtime.getURL('/images/Downgrade_Dark.svg'), 6: chrome.runtime.getURL('/images/Robux_Dark.svg'), 7: chrome.runtime.getURL('/images/RAP_Dark.svg'), 8: chrome.runtime.getURL('/images/Any_Dark.svg')}
	itemHTML = `<div class="section-content" style="padding:0px;width:260px;height:100px;position:absolute;left:5px;">
						<a>
							<img style="margin-left:10px;width:60px;float:left;" class="border-bottom item-icon" src="${icons[Math.abs(itemID)]}"><div class="border-bottom" style="position:absolute;right:5px;"><div style="margin-top:17px;font-size:13px;float:left;"><br></div><div style="float:right;">
						<a><div style="margin-top:${margin}px;font-size:13px;float:left;"><span style="float:right;"></span><br><span style="float:right;"></span></div></a>
					<button type="button" class="btn-growth-lg createOfferButton" itemID="${itemID}" itemName="${itemName}" itemRAP="${itemRAP}" itemValue="${itemValue}" style="margin:5px;margin-left:10px;margin-top:15px;height:40px;width:40px;background-color:#0084DD;border:0px;font-size:30px;padding:5px;float:right;">+</button></div></div>
						<span style="" class="rbx-divider"></span>
					<div style="white-space:nowrap;overflow:hidden;width:260px;position:absolute;padding:15px;top:55px;right:5px;">
					<span>${itemName}
					</span>
						</div>
						</div>`
	li.innerHTML += itemHTML
	if ($('.light-theme').length > 0  && itemID < -1) {
		li.getElementsByClassName('item-icon')[0].style.filter = "invert(1)"
	}
	li.getElementsByClassName('createOfferButton')[0].addEventListener("click", function(){ insertItem(this, secondary) })
	return li
}

async function populateInventory(search, secondary) {
	inventoryList = document.getElementById('inventoryList')
	inventoryList.innerHTML = ""
	queries = search.split(" ")
	items = getItems()
	console.log(myInventory)
	for (item in myInventory) {
		myItem = myInventory[item]
		valid = true
		for (i = 0; i < queries.length; i++) {
			if (myItem['name'].toLowerCase().includes(queries[i].toLowerCase()) == false) {
				valid = false
			}
		}
		console.log(valid)
		if (valid == true) {
			count = 0
			for (i = 0; i < items.length; i++) {
				if (items[i] == myItem['assetId']) {
					count++;
				}
			}
			if (myItem['quantity'] - count > 0) {
				newItem = createInventoryItem(myItem['assetId'], myItem['name'], myInventoryItemInfo[myItem['assetId']]['rap'], myInventoryItemInfo[myItem['assetId']]['value'], myItem['quantity'] - count, secondary)
				inventoryList.appendChild(newItem)
				setAssetThumbnail(myItem['assetId'])
			}
		}
	}
}

async function populateCatalogSearch(search, secondary) {
	catalogList = document.getElementById('catalogList')
	catalogList.innerHTML = ""
	items = [{id: -2, name: "Demand Items", rap: 0, value: -1}, {id: -3, name: "Rare Items", rap: 0, value: -1}, {id: -4, name: "Upgrades", rap: 0, value: -1}, {id: -5, name: "Downgrades", rap: 0, value: -1}, {id: -6, name: "Robux", rap: 0, value: -1}, {id: -7, name: "RAP Items", rap: 0, value: -1}, {id: -8, name: "Any Items", rap: 0, value: -1}]
	for (i = 0; i < items.length; i++) {
		item = items[i]
		newItem = createCatalogItem(item['id'], item['name'], item['rap'], item['value'], true)
		catalogList.appendChild(newItem)
	}
}

async function createInventory(container, secondary) {
	$("#inventorySelector").remove()
	position = parseInt(container.getAttribute("id").replace("itemContainer", ""))
	left = position * 83
	offerEditor = document.getElementById("offerEditor")
	div = document.createElement("div")
	div.setAttribute("class", "section-content")
	div.setAttribute("style", `left:${left}px;top:108px;position:absolute;width:300px;height:400px;z-index:10;padding:15px;`)
	div.setAttribute("id", "inventorySelector")
	inventoryHTML = `<span style="width:200px;font-weight:bold;font-size:23px;float:left;" class="border-bottom item-name-container">Offer</span><div style="padding-top:0px;margin-top:0px;position:absolute;top:65px;width:270px;height:320px;" class="content"><div id="searchItem" style="margin-top:15px;height:45px;position:relative;">
					<div style="width:260px;margin-left:5px;margin-top:-7px;margin-bottom:0px;" class="input-group"><input autofocus id="searchInventory" class="form-control input-field" type="text" placeholder="Search" maxlength="120" autocomplete="off" value=""><div class="input-group-btn"><button style="margin:0px;margin-left:2px;" class="input-addon-btn" type="submit"><span class="icon-nav-search"></span></button></div></div>
						</div><ul class="inventoryList" style="width:283px;height:265px;overflow-y:auto;position:relative;" id="inventoryList">
					</ul></div>`
	div.innerHTML += inventoryHTML
	offerEditor.appendChild(div)
	if (myInventory == -1) {
		await loadInventory()
	}
	$("#searchInventory").on('input', function(){
		populateInventory($("#searchInventory").val(), secondary)
	})
	$("#inventorySelector").on('mouseleave', function(){
		$("#inventorySelector").remove()
	})
	populateInventory("", secondary)
}

async function createCatalogSearch(container, secondary) {
	$("#inventorySelector").remove()
	position = parseInt(container.getAttribute("id").replace("itemContainer", ""))
	left = position * 83
	offerEditor = document.getElementById("offerEditor")
	div = document.createElement("div")
	div.setAttribute("class", "section-content")
	div.setAttribute("style", `left:${left}px;top:108px;position:absolute;width:300px;height:400px;z-index:10;padding:15px;`)
	div.setAttribute("id", "inventorySelector")
	inventoryHTML = `<span style="width:200px;font-weight:bold;font-size:23px;float:left;" class="border-bottom item-name-container">Request</span><div style="padding-top:0px;margin-top:0px;position:absolute;top:65px;width:270px;height:320px;" class="content"><div id="searchItem" style="margin-top:15px;height:45px;position:relative;">
					<div style="width:260px;margin-left:5px;margin-top:-7px;margin-bottom:0px;" class="input-group"><div id="filterSearchBar" style="overflow:visible;margin-top:-5px;margin-left:0px;float:left;width:260px;margin-left:0px;position:relative;" class="input-group-btn">
					<div class="input-group"><div><input id="filterSearch" class="form-control input-field new-input-field" placeholder="Item Search" maxlength="120" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" value=""></div><div class="input-group-btn"><button style="margin-left:9px;" class="input-addon-btn"><span class="icon-common-search-sm"></span></button></div></div>
					<ul id="itemSearchList" style="position:absolute;top:38px;z-index:1000;"></ul>
					<ul id="itemSearchSelection" style="position:absolute;top:48px;width:100%;"></ul>
					</div></div>
						</div><ul class="inventoryList" style="width:283px;height:265px;overflow-y:auto;position:relative;" id="catalogList">
					</ul></div>`
	div.innerHTML += inventoryHTML
	offerEditor.appendChild(div)
	document.getElementById('filterSearch').focus()
	$("#filterSearch").on("keyup", function(event) {
		if (event.keyCode === 13) {
			if (document.getElementById('itemSearchList').children.length > 0) {
				document.getElementById('itemSearchList').children[0].click()
			} else if (document.getElementById('secondaryContinue') != null && document.getElementById('secondaryContinue').getAttribute('active') == 'true') {
				document.getElementById('secondaryContinue').click()
			} else if (document.getElementById('secondaryReload') != null) {
				document.getElementById('secondaryReload').click()
			}
		}
	});			  
	$("#filterSearch").on('input', async function(){
		currentValue = this.value
		if (currentValue != '') {
			items = JSON.parse(await fetchItemMiniSearch(this.value))
			if (this.value == currentValue) {
				list = document.getElementById('itemSearchList')
				list.innerHTML = ''
				for (j = 0; j < items.length; j++) {
					li = document.createElement('li')
					li.classList.add('item-search-element')
					li.style.backgroundColor = '#393B3D'
					li.style.borderBottom = '1px solid hsla(0,0%,100%,.1)'
					li.setAttribute('itemid', parseInt(items[j].id))
					li.setAttribute('itemname', stripTags(items[j].name))
					li.setAttribute('itemrap', parseInt(items[j].rap))
					li.setAttribute('itemvalue', parseInt(items[j].value))
					li.innerHTML = `<div style="z-index:1000;margin-top:0px;padding-left:5px;height:30px;position:relative;"><div style="margin-left:0px;display:inline-block;width:255px;text-align:left;overflow:hidden;white-space: nowrap;"><img style="width:30px;margin-left:-4px;margin-right:5px;margin-bottom:3px;" class="ropro-image-${parseInt(items[j].id)}" src="${chrome.runtime.getURL('/images/empty.png')}" id="tradeFilterImage"><span id="tradeFilterText">${stripTags(items[j].name)}</span></div></div>`
					list.appendChild(li)
					setAssetThumbnail(items[j].id)
					li.addEventListener('click', function(){
						itemName = this.getAttribute('itemname')
						itemID = this.getAttribute('itemid')
						itemRAP = this.getAttribute('itemrap')
						itemValue = this.getAttribute('itemvalue')
						console.log(itemName, itemID, itemRAP, itemValue)
						li = document.createElement("li")
						li.setAttribute("style", "height:110px;position:relative;")
						margin = 17
						if (itemValue == -1) {
							valueString = ""
						} else {
							margin = 5
							valueString = `<br><span style="float:right;"><img style="width:10px;" src="${chrome.runtime.getURL('/images/ropro_icon_small.png')}"> ${stripTags(addCommas(itemValue))}</span>`
						}
						itemHTML = `<div class="section-content" style="padding:0px;width:260px;height:100px;position:absolute;left:5px;">
											<a href="https://www.roblox.com/catalog/${parseInt(itemID)}/Item">
												<img style="margin-left:10px;width:60px;float:left;" class="border-bottom ropro-image-${parseInt(itemID)}" src="${chrome.runtime.getURL('/images/empty.png')}"><div class="border-bottom" style="position:absolute;right:5px;"><div style="margin-top:${margin}px;font-size:13px;float:left;"><span style="float:right;">x 1}</span><br><span style="float:right;margin-top:-5px;margin-bottom:-5px;"><span style="margin-left:-5px;margin-right:-8px;margin-bottom:0px;transform: scale(0.4);" id="nav-robux" class="icon-robux-28x28 roblox-popover-close"></span> ${stripTags(addCommas(itemRAP))}</span>${valueString}</div><div style="float:right;">
											</a>
										<button type="button" class="btn-growth-lg createOfferButton" itemID="${parseInt(itemID)}" itemName="${stripTags(itemName)}" itemRAP="${parseInt(itemRAP)}" itemValue="${parseInt(itemValue)}" style="margin:5px;margin-left:10px;margin-top:15px;height:40px;width:40px;background-color:#0084DD;border:0px;font-size:30px;padding:5px;float:right;">+</button></div></div>
											<span style="" class="rbx-divider"></span>
										<div style="white-space:nowrap;overflow:hidden;width:260px;position:absolute;padding:15px;top:55px;right:5px;">
										<span>${stripTags(itemName)}
										</span>
											</div>
											</div>`
						li.innerHTML += itemHTML
						setAssetThumbnail(itemID)
						catalogItemInfo[parseInt(itemID)] = {"rap": parseInt(itemRAP), "value": parseInt(itemValue)}
						insertItem(li.getElementsByClassName('createOfferButton')[0], true)
					})
				}
			}
		} else {
			document.getElementById('itemSearchList').innerHTML = ''
			currentValue = ''
		}
	})
	$("#inventorySelector").on('mouseleave', function(){
		$("#inventorySelector").remove()
	})
	populateCatalogSearch("", secondary)
}

async function updateValue(myItem){
	rap = 0
	value = 0
	wantrap = 0
	wantvalue = 0
	wantAddedValue = 0
	offerBox = myItem.parentNode.parentNode.parentNode
	offerItems = offerBox.getElementsByClassName("offeritem")
	for (i = 0; i < 8; i++) {
		offerItem = offerItems[i]
		itemRap = parseInt(offerItem.getAttribute("rap"))
		itemValue = parseInt(offerItem.getAttribute("value"))
		if (itemRap != -1) {
			if (i < 4) {
				rap += itemRap
			} else {
				wantrap += itemRap
			}
		}
		if (itemValue != -1) {
			if (i < 4) {
				value += itemValue
			} else {
				wantvalue += itemValue
			}
		}
	}
	offerValue = offerBox.getElementsByClassName("wantvalue")
	if (offerValue.length == 1) {
		wantAddedValue = parseInt(offerValue[0].getAttribute("value"))
	}
	if (rap > 0) {
		offerBox.getElementsByClassName('itemrap')[0].getElementsByClassName('total-value')[0].innerHTML = stripTags(addCommas(rap))
	}
	if (value > 0 && tradeOffersValueCalculator) {
		offerBox.getElementsByClassName('itemvalue')[0].getElementsByClassName('total-value')[0].innerHTML = stripTags(addCommas(value))
	} else {
		offerBox.getElementsByClassName('itemvalue')[0].setAttribute("style", stripTags(offerBox.getElementsByClassName('itemvalue')[0].getAttribute("style")) + "display:none;")
	}
	if (wantrap > 0) {
		offerBox.getElementsByClassName('wantitemrap')[0].getElementsByClassName('total-value')[0].innerHTML = stripTags(addCommas(wantrap + wantAddedValue))
	}
	if (wantvalue > 0 && tradeOffersValueCalculator) {
		offerBox.getElementsByClassName('wantitemvalue')[0].getElementsByClassName('total-value')[0].innerHTML = stripTags(addCommas(wantvalue + wantAddedValue))
	} else {
		offerBox.getElementsByClassName('wantitemvalue')[0].setAttribute("style", stripTags(offerBox.getElementsByClassName('wantitemvalue')[0].getAttribute("style")) + "display:none;")
	}
}

async function createWish(myUser, json) {
	wishNote = stripTags(json.note)
	userId = json.user
	posted = json.posted
	username = json.username
	wishId = json.wishid
	offers = document.getElementById("wishlistOffers")
	offer = await createOffer(myUser, userId, username, posted, wishNote, wishId)
	offers.appendChild(offer)
	offering = offer.getElementsByClassName('offering')[0]
	want = offer.getElementsByClassName('want')[0]
	for (i = json.items.length - 1; i >= 0; i--) {
		item = json.items[i]
		insertAfter(createItem(item, i, false), offering)
		setAssetThumbnail(item['id'])
	}
	myItem = createItem(json.item4, 0, false)
	insertAfter(myItem, want)
	setAssetThumbnail(json.item4['id'])
	myItem = createItem(json.item3, 0, false)
	insertAfter(myItem, want)
	setAssetThumbnail(json.item3['id'])
	myItem = createItem(json.item2, 0, false)
	insertAfter(myItem, want)
	setAssetThumbnail(json.item2['id'])
	myItem = createItem(json.item, 0, false)
	insertAfter(myItem, want)
	setAssetThumbnail(json.item['id'])
	updateValue(myItem)
}

async function getWishes(wishPage) {
	if (document.getElementById('offersLoading').style.display == "none" && loadingOffers == false) {
		loadingOffers = true
		document.getElementById('offersLoading').style.display = "block"
		wishlist = await fetchWishlist(wishPage)
		myUser = await getStorage("rpUserID")
		wishlist = JSON.parse(wishlist)
		console.log(wishlist)
		if (wishlist['valid'] == true) {
			if (wishlist['none'] == false) {
				wishes = wishlist['wishes']
				var userIds = []
				if (wishPage == 0) {
					document.getElementById('wishlistOffers').innerHTML = ""
				}
				for (i = 0; i < wishes.length; i++) {
					wish = wishes[i]
					createWish(myUser, wish)
					userIds.push(wish.user)
				}
				loadPlayerThumbnails(userIds)
			} else {
				document.getElementById('wishlistOffers').innerHTML = '<p style="margin-left:20px;margin-bottom:30px;">No wishlist offers for this item... Be the first to post one!</p>'
			}
		}
		if (wishlist['more']) {
			document.getElementById('seemore_wishlist').setAttribute('style', 'display:block;')
			document.getElementById('seemore_wishlist').setAttribute('page', parseInt(document.getElementById('seemore_wishlist').getAttribute('page')) + 1)
		} else {
			document.getElementById('seemore_wishlist').setAttribute('style', 'display:none;')
		}
		document.getElementById('offersLoading').style.display = "none"
		setTimeout(function() {
			loadingOffers = false
		}, 1000)
	}
}

async function loadInventory() {
	myInventory = 1
	myID = await getStorage("rpUserID")
	myInventory = await fetchInventory(myID)
	myInventoryItemInfo = await fetchItemInfo(Object.keys(myInventory))
}

function wishlistMain() {
	wishlist = document.createElement("div")
	wishlist.innerHTML += wishlistHTML
	wishlist.setAttribute("id", "wishlist")
	wishlist.setAttribute("class", "tab-pane resellers-container")
	wishlist.setAttribute("style", "width:1100px;margin:auto;")
	document.getElementsByClassName('content')[0].appendChild(wishlist)
	seeMoreWishlist = document.getElementById('seemore_wishlist')
	seeMoreWishlist.addEventListener("click", function(){
		if (document.getElementById('offersLoading').style.display == "none") {
			getWishes(parseInt(seeMoreWishlist.getAttribute("page")))
		}
	});
	getWishes(0)
	createOfferButton = document.getElementById('createOfferButton')
	refreshOffers = document.getElementById('refreshOffers')
	refreshOffers.addEventListener("click", async function() {
		if (document.getElementById('offersLoading').style.display == "none") {
			document.getElementById('seemore_wishlist').setAttribute("page", 0)
			getWishes(parseInt(seeMoreWishlist.getAttribute("page")))
			document.getElementById('createOfferButton').innerHTML = chrome.i18n.getMessage("CreateOffer")
		}
	})
	createOfferButton.addEventListener("click", async function(){
		if (createOfferButton.innerHTML == chrome.i18n.getMessage("CreateOffer")) {
			wishlistOffers = document.getElementById('wishlistOffers')
			editor = await createOfferEditor()
			wishlistOffers.insertBefore(editor, wishlistOffers.childNodes[0])
			updateOfferBuilder()
			createOfferButton.innerHTML = chrome.i18n.getMessage("CloseOffer")
			container1 = document.getElementById('itemContainer1')
			container2 = document.getElementById('itemContainer2')
			container3 = document.getElementById('itemContainer3')
			container4 = document.getElementById('itemContainer4')
			container5 = document.getElementById('itemContainer5')
			container6 = document.getElementById('itemContainer6')
			container7 = document.getElementById('itemContainer7')
			container8 = document.getElementById('itemContainer8')
			postOfferButton = document.getElementById('postOfferButton')
			container1.addEventListener("click", function(){ addItem(this,false) })
			container1.addEventListener("mouseover", function(){ hoverItem(this) })
			container1.addEventListener("mouseout", function(){ leaveItem(this) })
			container2.addEventListener("click", function(){ addItem(this, false) })
			container2.addEventListener("mouseover", function(){ hoverItem(this) })
			container2.addEventListener("mouseout", function(){ leaveItem(this) })
			container3.addEventListener("click", function(){ addItem(this, false) })
			container3.addEventListener("mouseover", function(){ hoverItem(this) })
			container3.addEventListener("mouseout", function(){ leaveItem(this) })
			container4.addEventListener("click", function(){ addItem(this, false) })
			container4.addEventListener("mouseover", function(){ hoverItem(this) })
			container4.addEventListener("mouseout", function(){ leaveItem(this) })
			container5.addEventListener("click", function(){ addItem(this, true) })
			container5.addEventListener("mouseover", function(){ hoverItem(this) })
			container5.addEventListener("mouseout", function(){ leaveItem(this) })
			container6.addEventListener("click", function(){ addItem(this, true) })
			container6.addEventListener("mouseover", function(){ hoverItem(this) })
			container6.addEventListener("mouseout", function(){ leaveItem(this) })
			container7.addEventListener("click", function(){ addItem(this, true) })
			container7.addEventListener("mouseover", function(){ hoverItem(this) })
			container7.addEventListener("mouseout", function(){ leaveItem(this) })
			container8.addEventListener("click", function(){ addItem(this, true) })
			container8.addEventListener("mouseover", function(){ hoverItem(this) })
			container8.addEventListener("mouseout", function(){ leaveItem(this) })
			postOfferButton.addEventListener("click", function(){ postOffer() })
			var userID = await getStorage("rpUserID")
			loadPlayerThumbnails([parseInt(userID)])
		} else {
			document.getElementById('offerEditor').remove()
			createOfferButton.innerHTML = chrome.i18n.getMessage("CreateOffer")
		}
	});
}
var tradeOffersValueCalculator = true;
async function doMain() {
	tradeOffersValueCalculator = await fetchSetting("tradeOffersValueCalculator");
	setTimeout(function() {
		try{
			document.getElementsByClassName('content')[0].style.height = "initial"
			wishlistMain()
			document.title = 'RoPro ' + chrome.i18n.getMessage("TradeOffers")
		}catch{
			doMain()
		}
	}, 500)
	wrap = document.getElementById('wrap')
	if (wrap != null) {
		wrap.style.minHeight = "1300px"
	}
}

doMain()