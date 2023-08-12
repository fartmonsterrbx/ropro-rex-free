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

var assetId = null

function fetchWishlistAsset(assetId) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetURL", url:"https://api.ropro.io/getWishlistAsset.php?assetId=" + assetId + "&type=asset"}, 
			function(data) {
				resolve(data)
			}
		)
	})
}

function setWishlistAsset(assetId, value) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetURL", url:"https://api.ropro.io/setWishlistAsset.php?assetId=" + assetId + "&value=" + value + "&type=asset"}, 
			function(data) {
				resolve(data)
			}
		)
	})
}

function equipItem(assetId) {
    return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "PostValidatedURL", url:"https://avatar.roblox.com/v1/avatar/assets/" + parseInt(assetId) + "/wear"}, 
			function(data) {
				resolve(data)
			}
		)
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

async function roproWishlistMain() {
    var div = document.createElement('div')
    div.innerHTML = `<li style="margin-top:10px;display: block;"><a class="btn-growth-md btn-secondary-md">RoPro Wishlist</a></li>`
    var button = div.childNodes[0]
    document.getElementById('search-options').getElementsByTagName('form')[0].appendChild(button)
    button.addEventListener('click', function() {
        alert("!")
    })
}

function addQuickEquip() {
    var div = document.createElement('div')
    div.innerHTML = `<a class="btn-control-md" title="Quick Item Equip" style="margin-top:-2.5px;margin-left:5px;width:30px;height:30px;"><span class="icon-plus" style="transform:scale(0.7);margin-left:-9px;margin-top:-9px;"></span></a>`
    var button = div.childNodes[0]
    document.getElementsByClassName('label-checkmark')[0].parentNode.appendChild(button)
    button.addEventListener('click', async function() {
        await equipItem(assetId)
        document.getElementsByClassName('alert-success')[0].innerText = "Quick Equipped Item with RoPro"
        document.getElementsByClassName('alert-success')[0].classList.add('on')
        setTimeout(function() {
            document.getElementsByClassName('alert-success')[0].classList.remove('on')
        }, 2000)
    })
}

function addWishlistToggle(wishlistAsset) {
    var container = document.getElementsByClassName('item-social-container')[0]
    var wishlistToggleHTML = `<li class="favorite-button-container" style="margin-left:10px;">
    <div class="tooltip-container" data-toggle="tooltip" title="" data-original-title="Add to Favorites">
        <a id="toggle-wishlist" style="position:relative;" class="${wishlistAsset['active'] ? 'wishlist-active' : ''}">
            <span title="${addCommas(parseInt(wishlistAsset['count']))}" value="${parseInt(wishlistAsset['count'])}" id="wishlistCount">${addCommas(parseInt(wishlistAsset['count']))}</span>
            <img id="wishlistInactive" src="${chrome.runtime.getURL('/images/wishlist_inactive.png')}" style="margin-top:3px;width:17px;">
            <img id="wishlistActive" src="${chrome.runtime.getURL('/images/wishlist_active.png')}" style="margin-top:3px;width:17px;">
            <div id="wishlistTooltip" style="position:absolute;background-color:#191B1D;padding:10px;width:310px;z-index:1000;text-align:center;border-radius:10px;left:-50px;top:30px;"><b id="wishlistToggleTitle">${wishlistAsset['active'] ? 'Remove from' : 'Add to'} RoPro Wishlist</b><p style="margin-top:2px;font-size:14px;">We'll send you a notification when items on your wishlist drop in price.</p></div>
        </a></div>
    </li>`
    var div = document.createElement('div')
    div.innerHTML = wishlistToggleHTML
    container.appendChild(div.childNodes[0])
    document.getElementById('toggle-wishlist').addEventListener('click', async function() {
        if (this.classList.contains('wishlist-active')) {
            var setWishlist = await setWishlistAsset(assetId, false)
            if (setWishlist['success']) {
                this.classList.remove('wishlist-active')
                document.getElementById('wishlistToggleTitle').innerText = "Add to RoPro Wishlist"
                var wishlistCount = parseInt(document.getElementById('wishlistCount').getAttribute('value'))
                document.getElementById('wishlistCount').setAttribute("value", wishlistCount - 1)
                document.getElementById('wishlistCount').setAttribute("title", addCommas(wishlistCount - 1))
                document.getElementById('wishlistCount').innerText = addCommas(wishlistCount - 1)
            }
        } else {
            var setWishlist = await setWishlistAsset(assetId, true)
            if (setWishlist['success']) {
                this.classList.add('wishlist-active')
                document.getElementById('wishlistToggleTitle').innerText = "Remove from RoPro Wishlist"
                var wishlistCount = parseInt(document.getElementById('wishlistCount').getAttribute('value'))
                document.getElementById('wishlistCount').setAttribute("value", wishlistCount + 1)
                document.getElementById('wishlistCount').setAttribute("title", addCommas(wishlistCount + 1))
                document.getElementById('wishlistCount').innerText = addCommas(wishlistCount + 1)
            }
        }
    })
}

window.onload = async function(){
    assetId = parseInt(window.location.href.split('catalog/')[1])
    if (!isNaN(assetId)) {
        if (await fetchSetting('quickEquipItem')) {
            if (document.getElementsByClassName('label-checkmark').length > 0) {
                addQuickEquip()
            }
        }
        /**if (await fetchSetting('roproWishlist')) {
            var wishlistAsset = await fetchWishlistAsset(assetId)
            if (wishlistAsset['valid']) {
                addWishlistToggle(wishlistAsset)
            }
        }**/
    } else {
        assetId = null
    }
    var checkCategories = setInterval(function(){
        if (document.getElementById('category-panel-group') != null && document.getElementById('category-panel-group').childNodes.length > 1) {
            clearInterval(checkCategories)
            //roproWishlistMain()
        }
    }, 50)
}