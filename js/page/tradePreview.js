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


var cursor = ""
var tradeType = "inbound"
var loaded = false
var currentlyLoading = false
var tradeValues = {}
var tradeBarHeight = 0
var tradesArray = []
var myUsername = ""
var numLoaded = 0
var angular = null

function fetchTradeRows() {
	document.dispatchEvent(new CustomEvent('fetchTradeRows', {detail: {tradeTimeDisplay: true}}));
}

function fetchTrades(tradesType) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetURL", url:"https://trades.roblox.com/v1/trades/" + tradesType + "?cursor=" + cursor + "&limit=25&sortOrder=Desc"}, 
			function(data) {
				for (i = 0; i < data.data.length; i++) {
					tradesArray.push(data.data[i])
				}
				cursor = data.nextPageCursor
				resolve(data)
			}
		)
	})
}

function fetchUsername() {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetUsername"}, 
			function(data) {
				resolve(data)
			}
		)
	})
}

function getStorage(key) {
	return new Promise(resolve => {
		chrome.storage.local.get(key, function (obj) {
			resolve(obj[key])
		})
	})
}

function setStorage(key, value) {
	return new Promise(resolve => {
		chrome.storage.local.set({[key]: value}, function(){
			resolve()
		})
	})
}

function fetchTrade(tradeId) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetURL", url:"https://trades.roblox.com/v1/trades/" + tradeId}, 
			function(data) {
				resolve(data)
			}
		)
	})
}

function fetchCachedTrade(tradeId, cachedTrades) {
	return new Promise(resolve => {
		resolve(cachedTrades[tradeId])
	})
}

function fetchValues(trades) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "PostURL", url:"https://api.ropro.io/tradePreviewBackend.php", jsonData: trades}, 
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

function getValueHTML(theirValue, ourValue) {
	if (theirValue > ourValue) {
		color = "rgba(31, 255, 0, 0.2)"
	} else if (theirValue == ourValue) {
		color = "rgba(255, 255, 0, 0.2)"
	} else {
		color = "rgba(255, 0, 0, 0.2)"
	}
	ourValue = stripTags(addCommas(ourValue))
	theirValue = stripTags(addCommas(theirValue))
	valueHTML = `<span style="margin-top: 25px;background-color:${color};padding-left:5px;padding-right:5px;" class="font-caption-body text-date-hint text trade-sent-date ng-binding" ng-bind="trade.created | date:'shortDate'"><span class="icon icon-robux-16x16" style="background-image:url(${chrome.runtime.getURL('/images/ropro_icon_small.png')});background-position:1px 0px;background-size:80%;"></span>${ourValue}<hr style="padding:0px;margin:0px"><span class="icon icon-robux-16x16" style="background-image:url(${chrome.runtime.getURL('/images/ropro_icon_small.png')});background-position:1px 0px;background-size:80%;"></span>${theirValue}</span>`
	return valueHTML
}

async function getTrades() {
	if (tradePreviews) {
		tradeRows = $(".trade-row.trade-id:not(.loaded)")
		if (tradeRows.length > 0) {
			trades = []
			cachedTradesTemp = await getStorage("cachedTrades")
			cachedTrades = await getStorage("inboundsCache")
			if (typeof cachedTrades == "undefined") {
				cachedTrades = {}
			}
			for (tradeId in cachedTradesTemp) {
				cachedTrades[tradeId] = cachedTradesTemp[tradeId]
			}
			for (i = 0; i < tradeRows.length; i++) {
				tradeRow = tradeRows[i]
				tradeRow.classList.add("loaded")
				if (tradeRow.hasAttribute("tradeid")) {
					if (parseInt(tradeRow.getAttribute("tradeid")) in cachedTrades) {
						trade = fetchCachedTrade(parseInt(tradeRow.getAttribute("tradeid")), cachedTrades)
						numLoaded++
					} else {
						if (numLoaded < 10) {
							trade = fetchTrade(tradeRow.getAttribute("tradeid"))
							numLoaded++
						}
					}
					trades.push(trade)
				}
			}
			Promise.all(trades).then(async (values) => {
				for (i = 0; i < values.length; i++) {
					if (values[i] != null && !(values[i].id in cachedTrades)) {
						cachedTradesTemp[values[i].id] = values[i]
					}
				}
				if (values.length > 0) {
					setStorage("cachedTrades", cachedTradesTemp)
				}
				trades = {data:[]}
				trades.data = values
				tradeValues = await fetchValues(trades)
				for (key in tradeValues) {
					tradeRow = document.getElementsByClassName(key.toString())[0]
					if (typeof tradeRow != 'undefined') {
						trade = tradeValues[key]
						console.log(trade)
						if (Object.keys(trade[0])[0].toLowerCase() != myUsername.toLowerCase()) {
							value0 = trade[0][Object.keys(trade[0])[0]]
							value1 = trade[0][Object.keys(trade[0])[1]]
						} else {
							value0 = trade[0][Object.keys(trade[0])[1]]
							value1 = trade[0][Object.keys(trade[0])[0]]
						}
						if (typeof trade != 'undefined') {
							valueDiv = document.createElement("div")
							valueDiv.innerHTML += getValueHTML(value0, value1)
							tradeRow.getElementsByClassName('trade-row-details')[0].getElementsByTagName('div')[0].appendChild(valueDiv)
						}
					}
				}
			})
		}
	}
}

function addListeners() {
	document.getElementById('tab-Inbound').getElementsByTagName('a')[0].addEventListener("click", function(){
		numLoaded = 0
		cursor = ""
		tradeType = "inbound"
		tradeValues = {}
		currentlyLoading = false
		tradesArray = []
		if (tradePreviews) {
			getTrades()
		}
	});

	document.getElementById('tab-Outbound').getElementsByTagName('a')[0].addEventListener("click", function(){
		numLoaded = 0
		cursor = ""
		tradeType = "outbound"
		tradeValues = {}
		currentlyLoading = false
		tradesArray = []
		if (tradePreviews) {
			getTrades()
		}
	});

	document.getElementById('tab-Completed').getElementsByTagName('a')[0].addEventListener("click", function(){
		numLoaded = 0
		cursor = ""
		tradeType = "completed"
		tradeValues = {}
		currentlyLoading = false
		tradesArray = []
		if (tradePreviews) {
			getTrades()
		}
	});

	document.getElementById('tab-Inactive').getElementsByTagName('a')[0].addEventListener("click", function(){
		numLoaded = 0
		cursor = ""
		tradeType = "inactive"
		tradeValues = {}
		currentlyLoading = false
		tradesArray = []
		if (tradePreviews) {
			getTrades()
		}
	});
}

var tradePreviews = false
var tradeAge = false

async function doMain() {
	tradePreviews = await fetchSetting("tradePreviews")
	tradeAge = await fetchSetting("tradeAge")
	if (tradePreviews || tradeAge) {
		unloaded = false
		addListeners()
		setTimeout(function() {
			tradeBarHeight = document.getElementsByClassName('simplebar-content')[1].scrollHeight
			tradeTypeOld = tradeType
			setInterval(async function() {
				if (typeof document.getElementsByClassName('simplebar-content')[1] != "undefined") {
					fetchTradeRows()
					if (tradePreviews) {
						getTrades()
					}
					tradeBarHeight = document.getElementsByClassName('simplebar-content')[1].scrollHeight
					tradeTypeOld = tradeType
					if (unloaded == true) {
						addListeners()
						unloaded = false
					}
				} else {
					tradesArray = []
					tradeValues = {}
					cursor = ""
					unloaded = true
				}
			}, 200)
		}, 100)
		myUsername = await fetchUsername()
	}
}
doMain()
