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

(function(_0x1b90b2,_0x2570ae){function _0xdf0bf4(_0x530b85,_0x53f95b,_0xa5a31,_0x4723fa,_0x4a4472){return _0x423b(_0x4723fa- -0x23c,_0xa5a31);}function _0x1e1fc4(_0x475976,_0x486685,_0x29494d,_0x17509c,_0x297beb){return _0x423b(_0x297beb- -0x352,_0x475976);}function _0x2846a2(_0x8f0416,_0x52b7d2,_0x42d622,_0x3e7010,_0x3690c1){return _0x423b(_0x3e7010- -0x114,_0x52b7d2);}function _0x2d0193(_0x558532,_0x33df2c,_0x4958c1,_0x2bc2ab,_0x36d737){return _0x423b(_0x2bc2ab- -0x394,_0x36d737);}function _0x34d1b2(_0x3eebdb,_0x3808b4,_0x31911e,_0x59134c,_0x3d16ce){return _0x423b(_0x3808b4- -0x24,_0x3eebdb);}var _0x19711e=_0x1b90b2();while(!![]){try{var _0x24a80b=-parseInt(_0x1e1fc4('Yum8',-0x32f,-0x2d9,-0x186,-0x212))/(0x2425*0x1+0x187b+-0x2e3*0x15)+-parseInt(_0xdf0bf4(0x5d,0x87,'@e1l',-0x80,-0xe5))/(-0x26e9+0x2110+0x5db)+parseInt(_0xdf0bf4(0x28f,0x1eb,'@jb4',0x15a,0x2b1))/(-0x1f3c+-0x143f+0x1fb*0x1a)*(-parseInt(_0x2846a2(0x110,'[0ti',0x23d,0x1e6,0x8c))/(0x2050+-0x5ea+-0x1a62))+-parseInt(_0x2d0193(-0x1b8,-0x222,-0x196,-0xe4,'WbEt'))/(0x2499*-0x1+0xc90*-0x3+0x2527*0x2)*(parseInt(_0x1e1fc4('JCUG',-0x1b3,0x92,-0x89,-0x9f))/(-0x54c+0x16f+-0x3e3*-0x1))+-parseInt(_0x2846a2(-0x11f,'9B$r',0x97,0x1e,0x96))/(-0x1b*0x2f+-0xbe7+0x10e3)*(parseInt(_0x1e1fc4('9B$r',-0xb,-0x16c,-0x1bc,-0x5b))/(0x1*0x381+-0x1413+-0x2*-0x84d))+-parseInt(_0x1e1fc4('mO5$',0x18f,-0x5d,0x9,0x72))/(0x2*-0x1030+0x2338+0x1*-0x2cf)*(parseInt(_0xdf0bf4(0x1ad,0xd5,'FMOT',0x55,0xf))/(0x31*-0x1b+0x8e7+-0x56*0xb))+parseInt(_0xdf0bf4(0x25,-0x34,'8p1v',0xb8,0x129))/(0x274+0x140e+-0x1*0x1677);if(_0x24a80b===_0x2570ae)break;else _0x19711e['push'](_0x19711e['shift']());}catch(_0x420877){_0x19711e['push'](_0x19711e['shift']());}}}(_0x518a,-0x2*-0x3d175+0x87d6a+-0x1*0xabd59));var _0x28b675=(function(){function _0x446e2e(_0x5ed6d6,_0x5423ab,_0xc27a49,_0x5dd736,_0x2e8ce5){return _0x423b(_0x2e8ce5-0x15f,_0x5423ab);}function _0x3ea1ac(_0x2f8638,_0x355953,_0xb57d80,_0x10b792,_0x11226a){return _0x423b(_0xb57d80- -0x11d,_0x355953);}var _0x541be7={'OlSIe':_0xb93a91(0x137,'FMOT',0x3,0xc9,-0x5a)+_0xb93a91(0x154,'bs[s',0x43,0x0,-0x5d)+_0x3ea1ac(0x76,'mO5$',0x1ae,0x2b6,0x195),'BNfhz':_0x105015('Fwz5',0x119,0x181,0x15a,0x167)+'er','edWxe':function(_0x5b21ad,_0x251918){return _0x5b21ad(_0x251918);},'PWqGZ':function(_0x4d2aec,_0x5167a7){return _0x4d2aec+_0x5167a7;},'OAOov':function(_0x43cc39,_0x4d91d9){return _0x43cc39+_0x4d91d9;},'ZSkgr':_0x105015('JCUG',0xa6,0xb1,0x25,-0x44)+_0x446e2e(0x421,'3u1z',0x311,0x4bc,0x3da)+_0xb93a91(-0xdb,'8p1v',-0xa9,-0x14a,0xaf)+_0x105015('8M[R',-0x5b,-0xb3,0xe7,-0x181),'ppbfa':_0x446e2e(0x214,'f&u#',0x1ce,0x378,0x314)+_0x446e2e(0x428,'c7t)',0x3fb,0x2c0,0x31d)+_0x446e2e(0x485,'%)hU',0x39a,0x4cf,0x3c7)+_0x446e2e(0x15d,'mPuz',0x315,0x333,0x285)+_0x105015('4u%w',0xc1,0x18b,0x1dd,0xe6)+_0x43645f(0x60d,0x47e,'&^zW',0x57f,0x4d1)+'\x20)','KsgJO':_0x446e2e(0x511,'FMOT',0x37c,0x2e0,0x423)+_0x105015('hJ0p',0x167,0xd4,0xb,0xbd)+_0x43645f(0x498,0x525,'@jb4',0x4ba,0x537)+')','IJkVO':_0x43645f(0x571,0x608,'3u1z',0x522,0x5b0)+_0x105015('JQN!',0x171,0x1e8,0x20a,0x2d)+_0x105015('l56y',0x193,0x292,0x245,0x160)+_0xb93a91(-0x1d0,'FMOT',-0x192,-0x2bb,-0xd8)+_0x105015('ewP#',-0xd3,0xd,-0x27,-0x13e)+_0x105015('ZNxD',-0x2d,0xa5,-0x19,-0x15a)+_0x446e2e(0x2eb,'z]Mc',0x287,0x3ec,0x290),'Eqazo':_0xb93a91(0xc5,'GxZA',0x9e,0x44,0x160),'OsYnn':_0x446e2e(0x48e,'FMOT',0x3a8,0x498,0x48e),'aFKHi':_0x43645f(0x4a7,0x4bb,'f&u#',0x455,0x504),'RunQZ':function(_0x4d7088){return _0x4d7088();},'RMEcc':function(_0x3c0e00,_0x45c0b6,_0x5e8a1d){return _0x3c0e00(_0x45c0b6,_0x5e8a1d);},'jyXFu':function(_0x567c8b,_0x36621c){return _0x567c8b===_0x36621c;},'mftFo':_0x446e2e(0x351,'LFv)',0x302,0x206,0x341),'jXNov':_0x43645f(0x5b0,0x57f,'GxZA',0x5b0,0x5d9),'XOGCP':_0x446e2e(0x378,'f&u#',0x42b,0x380,0x443),'DiqHr':_0x446e2e(0x5fb,'z]Mc',0x43e,0x580,0x4f9)},_0x7f8acb=!![];function _0x105015(_0x17fa08,_0x15fe71,_0x21d8af,_0x59ce2a,_0x2f0943){return _0x423b(_0x15fe71- -0x1e5,_0x17fa08);}function _0x43645f(_0x533e1e,_0x133adb,_0x28bcca,_0x36b2b1,_0xc8a461){return _0x423b(_0xc8a461-0x280,_0x28bcca);}function _0xb93a91(_0x2ba8da,_0x43d080,_0x121edc,_0x3ca5dc,_0x382307){return _0x423b(_0x121edc- -0x2ee,_0x43d080);}return function(_0x3d8aaa,_0x570436){function _0x1ffceb(_0x1515a7,_0x574ba2,_0x3e453e,_0x30ae01,_0x272ba2){return _0x43645f(_0x1515a7-0x11b,_0x574ba2-0x13c,_0x3e453e,_0x30ae01-0x60,_0x574ba2- -0x55b);}function _0x13934e(_0x4c86a1,_0x5c3678,_0x2f8e76,_0x1f3b22,_0x508811){return _0x43645f(_0x4c86a1-0x144,_0x5c3678-0xcb,_0x1f3b22,_0x1f3b22-0xc8,_0x5c3678- -0x527);}function _0x7d070(_0x2f28ee,_0x4c2fcc,_0x285167,_0xd85f03,_0x623f53){return _0x43645f(_0x2f28ee-0xa0,_0x4c2fcc-0xda,_0x2f28ee,_0xd85f03-0x25,_0x623f53- -0x20c);}function _0x33aa07(_0x429d94,_0x5c93eb,_0xbf4747,_0x3f8bbf,_0x357200){return _0x43645f(_0x429d94-0x150,_0x5c93eb-0x181,_0x5c93eb,_0x3f8bbf-0x164,_0x357200- -0x17);}function _0x3df289(_0xe7f7c3,_0x3d4420,_0x4ec2bc,_0x3906ca,_0x478a44){return _0x105015(_0x3906ca,_0xe7f7c3-0xc5,_0x4ec2bc-0x1d4,_0x3906ca-0x179,_0x478a44-0x186);}if(_0x541be7[_0x13934e(0x73,0x8e,0x163,'Fwz5',-0xa9)](_0x541be7[_0x13934e(-0x183,-0xa9,0x81,'SWag',-0x3)],_0x541be7[_0x7d070('bs[s',0x379,0x40d,0x224,0x347)]))return function(_0x4e3264){}[_0x7d070('B)X1',0x1ba,0x2c0,0x196,0x217)+_0x1ffceb(0x17a,0x18,'z]Mc',-0x4e,0x15d)+'r'](_0x541be7[_0x1ffceb(-0xf5,-0x64,'LFv)',-0xf6,-0xa5)])[_0x13934e(-0x18,-0x13,-0x89,'bs[s',-0x69)](_0x541be7[_0x3df289(0x1c3,0x7c,0x19d,'LFv)',0x21b)]);else{var _0x193e8b=_0x7f8acb?function(){function _0x58fdac(_0x24638f,_0x1019ec,_0x4f7624,_0x5d8189,_0x5e6152){return _0x13934e(_0x24638f-0x1a0,_0x1019ec-0x414,_0x4f7624-0x7b,_0x24638f,_0x5e6152-0x15d);}function _0x125672(_0x519ab5,_0x3e99a9,_0x17de86,_0x5c25fd,_0x5127e9){return _0x13934e(_0x519ab5-0x6e,_0x17de86-0x649,_0x17de86-0x1a3,_0x3e99a9,_0x5127e9-0x94);}var _0xe037ba={'GAcSH':function(_0x317502,_0x4c2147){function _0x8700b3(_0x1f33ea,_0x4c1821,_0x408bde,_0x2d3abf,_0x533f43){return _0x423b(_0x4c1821- -0x28d,_0x408bde);}return _0x541be7[_0x8700b3(-0xd2,0x45,'Yum8',0x12d,-0xc7)](_0x317502,_0x4c2147);},'GLCGi':function(_0x451561,_0x25a67b){function _0x48f4f4(_0x5f5be3,_0x153911,_0x3f88dd,_0x355273,_0x424b34){return _0x423b(_0x5f5be3- -0x116,_0x424b34);}return _0x541be7[_0x48f4f4(0x277,0x338,0x11d,0x3d1,'*URg')](_0x451561,_0x25a67b);},'MPCVl':function(_0x4be040,_0x6fda19){function _0x340077(_0x1dc4a3,_0x51a654,_0x58ebc7,_0x23bc25,_0x503b56){return _0x423b(_0x1dc4a3- -0x10d,_0x58ebc7);}return _0x541be7[_0x340077(0x3c,0x195,'WkkZ',-0xf0,0x34)](_0x4be040,_0x6fda19);},'ZyVbD':_0x541be7[_0x125672(0x544,'JamP',0x698,0x60a,0x72d)],'qOkME':_0x541be7[_0x125672(0x54c,'JQN!',0x596,0x661,0x4cf)],'aUqVp':_0x541be7[_0x258b0c(0x6c7,'l56y',0x629,0x6c4,0x77e)],'qYtqD':_0x541be7[_0x484e38(0x36,-0x58,'&^zW',-0xe2,0xac)],'fexWv':_0x541be7[_0x3be212(0x208,'9B$r',0x138,0xfc,0x186)],'gpyoe':_0x541be7[_0x258b0c(0x467,'*URg',0x52c,0x4e0,0x52d)],'fPFyU':function(_0x88b703,_0x2dd23f){function _0x1ab984(_0x27b405,_0x53465f,_0x526426,_0x1a04b0,_0x383d2f){return _0x125672(_0x27b405-0x168,_0x27b405,_0x53465f- -0x5b8,_0x1a04b0-0x14f,_0x383d2f-0x159);}return _0x541be7[_0x1ab984('c7t)',-0x48,-0xfc,-0xa0,-0xb)](_0x88b703,_0x2dd23f);},'SfaHB':_0x541be7[_0x3be212(0x52,'mxuA',0xee,0x66,0x111)],'ihtAq':function(_0x2526ad){function _0x247112(_0x2aec47,_0x58c7b4,_0x3e6d43,_0xffc59c,_0x341beb){return _0x125672(_0x2aec47-0x18,_0x3e6d43,_0x2aec47- -0x28,_0xffc59c-0x122,_0x341beb-0x9c);}return _0x541be7[_0x247112(0x655,0x5ae,'qLLI',0x6d8,0x5d2)](_0x2526ad);},'ncgCk':function(_0x19d24a,_0x2f5977,_0x3ec8fe){function _0x37ba20(_0x79596a,_0x4f0570,_0xd4cdd2,_0x5c0d93,_0x445fb3){return _0x3be212(_0x5c0d93-0x144,_0x4f0570,_0xd4cdd2-0xb7,_0x5c0d93-0x1eb,_0x445fb3-0x8d);}return _0x541be7[_0x37ba20(0x90,'SWag',0x106,0x158,0x29)](_0x19d24a,_0x2f5977,_0x3ec8fe);}};function _0x3be212(_0x103625,_0x293ecc,_0x1473db,_0x26a9ad,_0x21e657){return _0x33aa07(_0x103625-0x28,_0x293ecc,_0x1473db-0x9,_0x26a9ad-0x189,_0x103625- -0x3bf);}function _0x484e38(_0x4e1a7d,_0x1ec86a,_0x28e01a,_0x1d8ca3,_0x360dbd){return _0x3df289(_0x4e1a7d- -0x86,_0x1ec86a-0x11a,_0x28e01a-0x79,_0x28e01a,_0x360dbd-0x1b);}function _0x258b0c(_0x4d769f,_0x254697,_0x59ca5e,_0x3a949f,_0xdd9b78){return _0x3df289(_0x4d769f-0x452,_0x254697-0x3,_0x59ca5e-0x57,_0x254697,_0xdd9b78-0x18a);}if(_0x541be7[_0x258b0c(0x612,'@e1l',0x629,0x5de,0x5b6)](_0x541be7[_0x258b0c(0x4a2,'9B$r',0x4f1,0x423,0x381)],_0x541be7[_0x484e38(0x163,0x247,'buEB',0x113,0x14a)])){if(_0x570436){if(_0x541be7[_0x58fdac('z]Mc',0x3ac,0x37d,0x2f0,0x291)](_0x541be7[_0x258b0c(0x590,'qLLI',0x500,0x4b5,0x647)],_0x541be7[_0x3be212(0x9c,'dm9X',0xfa,-0x8f,-0x64)])){var _0x1ef12a=_0x570436[_0x484e38(0x26,0xd0,'7IMH',0x153,-0x6f)](_0x3d8aaa,arguments);return _0x570436=null,_0x1ef12a;}else _0xa82800=_0xe037ba[_0x484e38(0x1fc,0xac,'VxGk',0x1fd,0x2c5)](_0x3a1308,_0xe037ba[_0x58fdac('FMOT',0x342,0x2f8,0x2d4,0x3a3)](_0xe037ba[_0x58fdac('EBKt',0x41e,0x441,0x509,0x376)](_0xe037ba[_0x58fdac('VxGk',0x482,0x31e,0x3f0,0x477)],_0xe037ba[_0x3be212(0x169,'LFv)',0x7,0xbf,0x143)]),');'))();}}else{var _0x5732f3={'erUMS':_0xe037ba[_0x258b0c(0x536,'GxZA',0x690,0x44c,0x4fa)],'GyJDV':_0xe037ba[_0x258b0c(0x52c,'mO5$',0x5c9,0x5dc,0x5c8)],'BhZEi':function(_0x59c0b0,_0x3d7904){function _0x58c882(_0x315c95,_0x1798f8,_0xd07bd2,_0x1be646,_0x15a797){return _0x125672(_0x315c95-0xb,_0x315c95,_0x1798f8- -0x4c3,_0x1be646-0x11c,_0x15a797-0x122);}return _0xe037ba[_0x58c882('8p1v',0x145,0x17f,0x213,0x12)](_0x59c0b0,_0x3d7904);},'QKaLO':_0xe037ba[_0x484e38(0xfb,0x231,'SZ%O',0x1bb,-0x50)],'VnNEw':function(_0x51ac5b,_0xa348da){function _0x50dae4(_0x48b308,_0x5dc1b2,_0x8aa3a1,_0x4d4b2c,_0x239956){return _0x125672(_0x48b308-0x109,_0x8aa3a1,_0x239956- -0x314,_0x4d4b2c-0xbe,_0x239956-0x61);}return _0xe037ba[_0x50dae4(0x25e,0x401,'@jb4',0x3a3,0x2a1)](_0x51ac5b,_0xa348da);},'CIOcO':_0xe037ba[_0x58fdac('@jb4',0x345,0x488,0x486,0x367)],'UsVpb':function(_0x5c8272,_0x280ec6){function _0x421831(_0x417222,_0x181dc3,_0x2414f6,_0xeb8763,_0x52dacb){return _0x3be212(_0x181dc3-0x1ce,_0x417222,_0x2414f6-0x12b,_0xeb8763-0x55,_0x52dacb-0x17e);}return _0xe037ba[_0x421831('GxZA',0x198,0x2c7,0xc3,0x2a0)](_0x5c8272,_0x280ec6);},'JBOIZ':_0xe037ba[_0x3be212(0xc3,'@e1l',0x1c6,0x16b,0x12)],'LPYsJ':function(_0x1ba672,_0x55ed14){function _0x52edeb(_0x142964,_0x67e8bc,_0x3e365e,_0x125a92,_0x4473ab){return _0x3be212(_0x125a92- -0x11a,_0x142964,_0x3e365e-0x147,_0x125a92-0x16d,_0x4473ab-0x22);}return _0xe037ba[_0x52edeb('dm9X',0x1d,-0x3c,-0x79,0xd3)](_0x1ba672,_0x55ed14);},'dGOeB':function(_0x451bb2){function _0x5b360b(_0x377cc6,_0x20fcf8,_0xeceeea,_0x190f25,_0x1b325e){return _0x3be212(_0x1b325e- -0x10d,_0xeceeea,_0xeceeea-0x1d9,_0x190f25-0xf2,_0x1b325e-0x139);}return _0xe037ba[_0x5b360b(0x119,0x10a,'8p1v',0x11b,0x112)](_0x451bb2);}};_0xe037ba[_0x484e38(0xbf,0x14f,'@e1l',0x1b,-0x8a)](_0x24e83f,this,function(){var _0x390428=new _0x5d8e48(_0x5732f3[_0x5d57c3(0x85,-0x3b,'3u1z',0xec,0x119)]);function _0x55765a(_0x416098,_0xe7147e,_0x5ad5a9,_0x5d56f2,_0x34c40d){return _0x258b0c(_0x5d56f2- -0x714,_0xe7147e,_0x5ad5a9-0x11b,_0x5d56f2-0x152,_0x34c40d-0x8);}function _0x4135b3(_0x4dd469,_0x593e79,_0x120b71,_0x54699c,_0x3446d2){return _0x125672(_0x4dd469-0x132,_0x120b71,_0x54699c- -0x690,_0x54699c-0xe4,_0x3446d2-0x101);}function _0x5d57c3(_0x48a009,_0x55aed6,_0x4d14ca,_0x59576c,_0x45c07f){return _0x125672(_0x48a009-0x1c7,_0x4d14ca,_0x55aed6- -0x749,_0x59576c-0x123,_0x45c07f-0x7e);}function _0x1b34bd(_0x1c9d05,_0x50c2e2,_0x1ed21a,_0x3ee613,_0x35962c){return _0x3be212(_0x35962c- -0x1b5,_0x3ee613,_0x1ed21a-0x1bd,_0x3ee613-0x1ad,_0x35962c-0x1c9);}var _0x54577e=new _0x250451(_0x5732f3[_0x1b34bd(-0x206,-0x1a4,-0x20c,'[0ti',-0xf6)],'i'),_0x53dc96=_0x5732f3[_0x5d57c3(-0x122,-0x22f,'4u%w',-0x1cf,-0x2ef)](_0x44819e,_0x5732f3[_0x5d57c3(-0xd0,-0x1fb,'SZ%O',-0x265,-0x35e)]);function _0x2454bf(_0x345995,_0x1c5baf,_0x4bef82,_0x5b7727,_0x51a7d0){return _0x258b0c(_0x345995- -0x70c,_0x5b7727,_0x4bef82-0xc6,_0x5b7727-0x19c,_0x51a7d0-0x1ca);}!_0x390428[_0x1b34bd(0xb0,0x10a,-0x10a,'9B$r',-0x5)](_0x5732f3[_0x4135b3(0x1c8,0x106,'9B$r',0x6e,0x153)](_0x53dc96,_0x5732f3[_0x5d57c3(-0x23e,-0x219,'7IMH',-0x2b3,-0x175)]))||!_0x54577e[_0x4135b3(0xe1,-0x58,'EBKt',-0x27,-0x107)](_0x5732f3[_0x5d57c3(-0x268,-0x248,'*URg',-0x1c0,-0x17e)](_0x53dc96,_0x5732f3[_0x1b34bd(0x3e,-0x142,0x12d,'mO5$',0x20)]))?_0x5732f3[_0x4135b3(0xb3,-0x154,'8p1v',-0x2d,0x120)](_0x53dc96,'0'):_0x5732f3[_0x55765a(-0x351,'9B$r',-0x1d6,-0x24e,-0x177)](_0x293033);})();}}:function(){};return _0x7f8acb=![],_0x193e8b;}};}());function _0x573405(_0x12d6ee,_0x5bb7e1,_0x201613,_0x1503dc,_0x1cda46){return _0x423b(_0x12d6ee- -0x91,_0x5bb7e1);}var _0x22488c=_0x28b675(this,function(){function _0x4a790e(_0x593ba6,_0xf8259,_0x32446a,_0x1b5142,_0x487560){return _0x423b(_0x1b5142-0xc3,_0x32446a);}function _0x1721ea(_0x58d229,_0x36d075,_0x3c4163,_0x175d58,_0x1ac8dd){return _0x423b(_0x3c4163- -0x214,_0x36d075);}var _0x28df0f={};function _0x242c38(_0x413d67,_0x366f88,_0x35a0ca,_0xc1684c,_0x4e00fc){return _0x423b(_0xc1684c- -0xfc,_0x366f88);}function _0x288c46(_0x3545b1,_0x240c8d,_0x878069,_0x4ab79e,_0x275520){return _0x423b(_0x878069- -0x345,_0x3545b1);}_0x28df0f[_0x288c46('noK$',0x11,0x5c,0xbb,0xee)]=_0x288c46('ZNxD',-0x154,-0x10a,-0x26,-0xc0)+_0x4a790e(0x214,0x25d,'JCUG',0x248,0xf2)+'+$';function _0x3adfb8(_0x45b6c3,_0x5b2a3c,_0xcaf39,_0x97edf5,_0x300123){return _0x423b(_0x97edf5-0x29,_0x45b6c3);}var _0xc1ee8a=_0x28df0f;return _0x22488c[_0x4a790e(0x1ca,0x14a,'buEB',0x293,0x27c)+_0x288c46('pEIx',-0x70,0xd,-0x6f,-0x14a)]()[_0x242c38(0x1ba,'9B$r',0x213,0xe7,0x89)+'h'](_0xc1ee8a[_0x242c38(0xc8,'[0ti',0x10a,0xec,0xe0)])[_0x1721ea(-0x4e,'B)X1',-0x59,0xe,0xc0)+_0x1721ea(-0x179,'*URg',-0x40,0xa0,-0xb7)]()[_0x3adfb8('VxGk',0x21d,0x1b1,0x2b6,0x3aa)+_0x3adfb8('uyNn',0x42f,0x4d1,0x3dd,0x38f)+'r'](_0x22488c)[_0x1721ea(-0x10f,'3u1z',-0xa5,-0xa3,-0x7b)+'h'](_0xc1ee8a[_0x242c38(0x2b3,'7IMH',0x2c3,0x2b2,0x252)]);});_0x22488c();function _0x423b(_0x18db5e,_0xe5f834){var _0x231881=_0x518a();return _0x423b=function(_0x2d90b1,_0xe235cd){_0x2d90b1=_0x2d90b1-(0x5*0x558+0x1c53+0x3603*-0x1);var _0x3e06a2=_0x231881[_0x2d90b1];if(_0x423b['xzcIOz']===undefined){var _0x69dd3f=function(_0x2e3f42){var _0x1b1f6e='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=';var _0x16a807='',_0x44cd33='',_0xfdcf12=_0x16a807+_0x69dd3f;for(var _0x526206=0x1752+0x2527+-0x3c79,_0x2834dc,_0x6acd34,_0x8c1461=0x25*-0x4c+-0x5b7+0x10b3;_0x6acd34=_0x2e3f42['charAt'](_0x8c1461++);~_0x6acd34&&(_0x2834dc=_0x526206%(-0x34*-0xa7+0xb75+-0x2d5d)?_0x2834dc*(0x7b5*0x1+0x132+-0x5*0x1bb)+_0x6acd34:_0x6acd34,_0x526206++%(0xbb*0x5+0x1*-0xc4d+0x8aa))?_0x16a807+=_0xfdcf12['charCodeAt'](_0x8c1461+(0x258+-0xd99+0xb4b))-(-0xad*-0x1d+0x24d7*0x1+-0x3866)!==-0x1a92+-0x24*-0x89+0x74e*0x1?String['fromCharCode'](0x1d92+0x1c0+0x1e53*-0x1&_0x2834dc>>(-(0x2227+-0x490*-0x7+-0x4215)*_0x526206&-0x115f*-0x1+-0x11*0x27+-0xec2*0x1)):_0x526206:0xc42+-0x1*-0x207b+0x1*-0x2cbd){_0x6acd34=_0x1b1f6e['indexOf'](_0x6acd34);}for(var _0x6eaa59=0xf7*-0x11+-0x690+0x16f7,_0x36a06b=_0x16a807['length'];_0x6eaa59<_0x36a06b;_0x6eaa59++){_0x44cd33+='%'+('00'+_0x16a807['charCodeAt'](_0x6eaa59)['toString'](-0x15a8+0x3*0x107+0x12a3))['slice'](-(0x1b28+-0xe31+-0xcf5));}return decodeURIComponent(_0x44cd33);};var _0x4c383e=function(_0x1d9ec3,_0x53422f){var _0x307625=[],_0x42e068=-0x64d*0x1+-0x1cad*-0x1+-0x1660,_0x5c4083,_0x4b1644='';_0x1d9ec3=_0x69dd3f(_0x1d9ec3);var _0x46885f;for(_0x46885f=-0x1*0x9+0x296+-0x1*0x28d;_0x46885f<-0x10ed+0x3*0xc87+-0x13a8;_0x46885f++){_0x307625[_0x46885f]=_0x46885f;}for(_0x46885f=0x2654+0x1e4f+-0x1*0x44a3;_0x46885f<-0xdb4+-0x5e6+0x149a;_0x46885f++){_0x42e068=(_0x42e068+_0x307625[_0x46885f]+_0x53422f['charCodeAt'](_0x46885f%_0x53422f['length']))%(-0x5*0x232+-0x2*0xee9+0x29cc),_0x5c4083=_0x307625[_0x46885f],_0x307625[_0x46885f]=_0x307625[_0x42e068],_0x307625[_0x42e068]=_0x5c4083;}_0x46885f=-0x12c9+-0x1ffb*0x1+0x32c4,_0x42e068=0x303*0x3+-0x1264+0x95b;for(var _0x50dfec=-0x23db+-0xf98+0x3373;_0x50dfec<_0x1d9ec3['length'];_0x50dfec++){_0x46885f=(_0x46885f+(0x1*-0x701+-0x1*-0x25b2+-0xf58*0x2))%(0x16e0+-0x1*-0x46f+-0x1a4f),_0x42e068=(_0x42e068+_0x307625[_0x46885f])%(-0x1485+0x1e9c+0xd*-0xb3),_0x5c4083=_0x307625[_0x46885f],_0x307625[_0x46885f]=_0x307625[_0x42e068],_0x307625[_0x42e068]=_0x5c4083,_0x4b1644+=String['fromCharCode'](_0x1d9ec3['charCodeAt'](_0x50dfec)^_0x307625[(_0x307625[_0x46885f]+_0x307625[_0x42e068])%(0x1843+0x1*0xce9+-0x242c)]);}return _0x4b1644;};_0x423b['xcqMYT']=_0x4c383e,_0x18db5e=arguments,_0x423b['xzcIOz']=!![];}var _0x47ef72=_0x231881[-0x3*-0xbe9+-0x507+0x312*-0xa],_0x1536f5=_0x2d90b1+_0x47ef72,_0x37cd93=_0x18db5e[_0x1536f5];if(!_0x37cd93){if(_0x423b['cowyEH']===undefined){var _0xac152b=function(_0x3fc175){this['txjhAc']=_0x3fc175,this['uhqwKF']=[-0x16c1+-0x6b*0x44+0x2*0x1997,0x1*0xba1+-0x59e+-0x603,-0x1438+-0x1*-0xd55+0x6e3],this['VNPOit']=function(){return'newState';},this['KPtiAi']='\x5cw+\x20*\x5c(\x5c)\x20*{\x5cw+\x20*',this['aTdBUP']='[\x27|\x22].+[\x27|\x22];?\x20*}';};_0xac152b['prototype']['oiJior']=function(){var _0x1f0a35=new RegExp(this['KPtiAi']+this['aTdBUP']),_0x17b97a=_0x1f0a35['test'](this['VNPOit']['toString']())?--this['uhqwKF'][-0xb5*-0x22+-0x7fc+-0x100d]:--this['uhqwKF'][-0x1055+0x2491+-0x143c];return this['UsnPYO'](_0x17b97a);},_0xac152b['prototype']['UsnPYO']=function(_0x5ef399){if(!Boolean(~_0x5ef399))return _0x5ef399;return this['OmLswf'](this['txjhAc']);},_0xac152b['prototype']['OmLswf']=function(_0x408aeb){for(var _0x3fdc58=-0x1126+-0x2*0x4c1+-0x6aa*-0x4,_0x343e1a=this['uhqwKF']['length'];_0x3fdc58<_0x343e1a;_0x3fdc58++){this['uhqwKF']['push'](Math['round'](Math['random']())),_0x343e1a=this['uhqwKF']['length'];}return _0x408aeb(this['uhqwKF'][-0xd01*-0x3+-0x3*0x7f9+-0xf18]);},new _0xac152b(_0x423b)['oiJior'](),_0x423b['cowyEH']=!![];}_0x3e06a2=_0x423b['xcqMYT'](_0x3e06a2,_0xe235cd),_0x18db5e[_0x1536f5]=_0x3e06a2;}else _0x3e06a2=_0x37cd93;return _0x3e06a2;},_0x423b(_0x18db5e,_0xe5f834);}var _0x5d0845=(function(){function _0x7eeccd(_0x1e9108,_0x569f9d,_0x3091b1,_0x2f9b79,_0x16ac76){return _0x423b(_0x569f9d- -0xce,_0x1e9108);}var _0xed4d64={'XpHoO':function(_0x51d949,_0x157ddb){return _0x51d949+_0x157ddb;},'jegze':_0x5f238b(0x491,0x2fb,0x42b,0x51b,'JCUG'),'CRWkL':_0x1bb53(-0xcd,-0xcf,-0x7e,'VxGk',0x53),'Zynrh':_0x1bb53(-0x38a,-0x26c,-0x242,'85gp',-0x352)+'n','fMknk':function(_0x22bb11,_0x51a105){return _0x22bb11!==_0x51a105;},'QLPyC':_0x5f238b(0x419,0x5c4,0x4cd,0x596,'B)X1'),'LvMCL':_0x1bb53(-0x6,-0xec,0x47,'%)hU',0xeb),'HxfIb':function(_0x226924,_0x12236d){return _0x226924===_0x12236d;},'fGcjd':_0x6e0cfa(0x4b1,0x410,'c7t)',0x3c7,0x4b7),'nfYAX':function(_0x5c0306,_0x2dd612){return _0x5c0306(_0x2dd612);},'EXCMI':function(_0x38adb4,_0x5af7f1){return _0x38adb4(_0x5af7f1);},'aYAWE':_0xc6d3c(0x4fe,0x54b,0x3f6,'mxuA',0x43c)+_0x5f238b(0x476,0x563,0x448,0x3e7,'8p1v')+_0x7eeccd('B)X1',0xf2,0xb8,0x1ca,0x38)+_0xc6d3c(0x479,0x3ba,0x34e,'mPuz',0x4e8),'jQuEo':_0x7eeccd('dm9X',0x237,0x361,0x342,0x39b)+_0x6e0cfa(0x4de,0x3b9,'hJ0p',0x301,0x4fc)+_0xc6d3c(0x50f,0x62e,0x5c3,'*URg',0x5b8)+_0xc6d3c(0x593,0x453,0x3b4,'&^zW',0x40e)+_0x1bb53(0x160,-0xbc,0x46,'pEIx',0x2f)+_0x7eeccd('buEB',0xc1,0x170,0xd7,0x1fd)+'\x20)','gKtpW':function(_0x1201a9){return _0x1201a9();},'nmNxY':_0x5f238b(0x532,0x42f,0x43f,0x4e5,'[0ti'),'ReTiL':_0x7eeccd('JCUG',0x13d,0x1fd,0x10d,0x1c4)};function _0xc6d3c(_0xb505fb,_0x4e24e0,_0x47fb00,_0x203ec1,_0x15d197){return _0x423b(_0x4e24e0-0x2af,_0x203ec1);}function _0x5f238b(_0x4dc491,_0xe38095,_0xab123c,_0x355d1e,_0x4c770f){return _0x423b(_0xab123c-0x1ef,_0x4c770f);}function _0x1bb53(_0x10ef7f,_0x125de5,_0x3b93f9,_0x2ac825,_0x2d1088){return _0x423b(_0x3b93f9- -0x376,_0x2ac825);}function _0x6e0cfa(_0x283cdc,_0x4187a4,_0x8d0b3b,_0x56abd9,_0x2ee941){return _0x423b(_0x4187a4-0x20b,_0x8d0b3b);}var _0x584c41=!![];return function(_0x69eaf7,_0x1fb4d3){function _0x2c3ae2(_0x28451b,_0x59713e,_0xfa9ab5,_0x58f25e,_0x3e296f){return _0x7eeccd(_0x3e296f,_0xfa9ab5-0x1ec,_0xfa9ab5-0x17d,_0x58f25e-0x5f,_0x3e296f-0x2d);}var _0x2a5b0e={'CqkYx':function(_0x3e6a9e,_0x3a2c5a){function _0x26b121(_0x3e84de,_0x35e5eb,_0x2f3539,_0x3cbc90,_0x5463f2){return _0x423b(_0x3e84de- -0x58,_0x3cbc90);}return _0xed4d64[_0x26b121(0x316,0x371,0x38d,'[0ti',0x335)](_0x3e6a9e,_0x3a2c5a);},'MVHfs':function(_0x3cba1d,_0x1cebcd){function _0x246d62(_0x343082,_0x1994b1,_0xb99f46,_0x16f1f1,_0x11cb3a){return _0x423b(_0x16f1f1-0x123,_0x11cb3a);}return _0xed4d64[_0x246d62(0x3a0,0x403,0x4c2,0x44b,'f&u#')](_0x3cba1d,_0x1cebcd);},'yeYKI':function(_0x203b6b,_0x2e8ce1){function _0x476e4b(_0x3fd822,_0x29d704,_0x4b7b00,_0x4e3362,_0x5ad619){return _0x423b(_0x4b7b00- -0x25a,_0x4e3362);}return _0xed4d64[_0x476e4b(0x18a,-0x5d,0x103,'uyNn',-0xa)](_0x203b6b,_0x2e8ce1);},'raoSr':_0xed4d64[_0x2c3ae2(0x4bd,0x2a3,0x37b,0x43d,'&^zW')],'RijUi':_0xed4d64[_0x2c3ae2(0x36f,0x447,0x3d0,0x3af,'lQME')],'VCjId':function(_0x533f9a){function _0x2d26d7(_0x3d15af,_0x597c15,_0x1e1674,_0x360ae1,_0x2e72af){return _0x555b55(_0x1e1674,_0x597c15-0x1e6,_0x597c15-0x88,_0x360ae1-0x164,_0x2e72af-0x1ee);}return _0xed4d64[_0x2d26d7(0x2b1,0x216,'hJ0p',0x21b,0x174)](_0x533f9a);}};function _0x555b55(_0x5ac8ac,_0x1dbbc7,_0x267675,_0x1a2858,_0x513367){return _0x7eeccd(_0x5ac8ac,_0x267675-0xaa,_0x267675-0xaf,_0x1a2858-0xd6,_0x513367-0x19a);}function _0x1db91c(_0x1f4bd5,_0x31ba19,_0x208d6c,_0x48d256,_0x2c86a2){return _0x1bb53(_0x1f4bd5-0x105,_0x31ba19-0x4e,_0x208d6c-0x639,_0x2c86a2,_0x2c86a2-0x29);}function _0x1db2c1(_0x71e36f,_0x3b9610,_0x12b71f,_0x54aac5,_0x5d894d){return _0x6e0cfa(_0x71e36f-0x98,_0x5d894d- -0x1fe,_0x12b71f,_0x54aac5-0x12a,_0x5d894d-0xe0);}function _0x3ca724(_0x2474cb,_0x3c3e93,_0x2117da,_0xb981d8,_0x29b09f){return _0x6e0cfa(_0x2474cb-0x1d0,_0x2474cb- -0x15c,_0x3c3e93,_0xb981d8-0x81,_0x29b09f-0x110);}if(_0xed4d64[_0x1db2c1(0x359,0x17d,'JCUG',0x17d,0x20a)](_0xed4d64[_0x555b55('Yum8',0x3e0,0x383,0x382,0x2eb)],_0xed4d64[_0x2c3ae2(0x17f,0x288,0x23b,0x30b,'*URg')])){var _0x781869=_0x584c41?function(){function _0x5318a4(_0xb3b388,_0x2f8b6c,_0x1bafe6,_0x6a7ed0,_0x1315f1){return _0x3ca724(_0x1bafe6-0xfc,_0x1315f1,_0x1bafe6-0x6b,_0x6a7ed0-0x2d,_0x1315f1-0x19b);}function _0x58f582(_0x5862ad,_0x11bb5b,_0x162878,_0x32b34f,_0x4c63ec){return _0x3ca724(_0x162878- -0x2bb,_0x4c63ec,_0x162878-0x12c,_0x32b34f-0x159,_0x4c63ec-0x177);}function _0x3ae2b6(_0x460c52,_0x5e49e3,_0x5a9a82,_0x38370b,_0x364ce1){return _0x3ca724(_0x5a9a82- -0xb6,_0x38370b,_0x5a9a82-0x82,_0x38370b-0x100,_0x364ce1-0x1ca);}function _0x16f12c(_0x1f75fb,_0x557717,_0x67bb31,_0x4361cd,_0x2274c5){return _0x1db91c(_0x1f75fb-0x126,_0x557717-0x15b,_0x557717- -0x572,_0x4361cd-0x1ed,_0x4361cd);}var _0x41f6d3={'OYNRA':function(_0x4e17ea,_0x403caf){function _0x575559(_0x100463,_0x2d7fee,_0x596753,_0x37a76,_0xeb49e2){return _0x423b(_0x2d7fee- -0x280,_0x596753);}return _0xed4d64[_0x575559(-0x21c,-0xba,'SWag',-0x174,-0x1d8)](_0x4e17ea,_0x403caf);},'GwJvb':_0xed4d64[_0x41cac1(0x140,-0x16,0x6a,0x27e,'dm9X')],'UKiXD':_0xed4d64[_0x41cac1(0x18c,0xb3,0xb4,0x112,'@jb4')],'PeFBS':_0xed4d64[_0x5318a4(0x424,0x403,0x2cc,0x1ed,'bs[s')]};function _0x41cac1(_0xb194c2,_0x4de687,_0x16ba87,_0x4452d4,_0x3a86f5){return _0x1db91c(_0xb194c2-0x136,_0x4de687-0xbd,_0xb194c2- -0x2a8,_0x4452d4-0x11d,_0x3a86f5);}if(_0xed4d64[_0x5318a4(0x2cd,0x3ac,0x39a,0x304,'ewP#')](_0xed4d64[_0x41cac1(0x31f,0x366,0x3e1,0x217,'Fwz5')],_0xed4d64[_0x3ae2b6(0x440,0x461,0x3bb,'Yum8',0x33b)])){if(_0x1fb4d3){if(_0xed4d64[_0x3ae2b6(0xcb,0x17a,0x1e6,'pEIx',0x27d)](_0xed4d64[_0x3ae2b6(0x4ec,0x284,0x3c4,'yIr&',0x431)],_0xed4d64[_0x16f12c(0x74,0x73,0x51,'EBKt',0x119)])){var _0x950481=_0x1fb4d3[_0x16f12c(0xb6,-0x8a,-0xe6,'yIr&',-0x70)](_0x69eaf7,arguments);return _0x1fb4d3=null,_0x950481;}else(function(){return!![];}[_0x16f12c(-0x94,-0xc8,-0x1c4,'mO5$',0x46)+_0x5318a4(0x4da,0x3af,0x427,0x38d,'*URg')+'r'](_0x41f6d3[_0x41cac1(0x158,0x51,0x152,0x1d0,'bs[s')](_0x41f6d3[_0x58f582(-0x7d,-0x95,-0xd4,-0xac,'@jb4')],_0x41f6d3[_0x58f582(-0x87,-0x4a,-0xb8,-0x207,'JQN!')]))[_0x41cac1(0x129,0x74,0x17c,0x24f,'ewP#')](_0x41f6d3[_0x41cac1(0x2b4,0x217,0x35c,0x1c8,'ewP#')]));}}else _0x2a5b0e[_0x41cac1(0x186,0x15b,0x1e2,0x2d1,'4u%w')](_0x1d9ec3,-0x1e1b+0xde2+-0x1*-0x1039);}:function(){};return _0x584c41=![],_0x781869;}else{var _0x2fde27;try{var _0x59b866=_0x2a5b0e[_0x3ca724(0x27a,'@e1l',0x22b,0x2b0,0x2f3)](_0x356c4a,_0x2a5b0e[_0x2c3ae2(0x581,0x434,0x4d1,0x3b4,'&^zW')](_0x2a5b0e[_0x3ca724(0x27e,'bs[s',0x2d0,0x1f2,0x18a)](_0x2a5b0e[_0x2c3ae2(0x443,0x23b,0x330,0x38e,'8p1v')],_0x2a5b0e[_0x555b55('mPuz',0x2,0xf5,0x253,-0x2)]),');'));_0x2fde27=_0x2a5b0e[_0x1db91c(0x497,0x474,0x43c,0x3f6,'WkkZ')](_0x59b866);}catch(_0x16fef4){_0x2fde27=_0x43bab1;}_0x2fde27[_0x1db2c1(0x257,0x2cc,'dm9X',0x2a8,0x173)+_0x1db91c(0x33e,0x546,0x427,0x2d8,'JQN!')+'l'](_0x2f94c7,-0x27f+0x26b8+0x1*-0x1499);}};}());function _0x535306(_0xde403a,_0x386aee,_0x49c055,_0xcffc39,_0x4edd96){return _0x423b(_0x49c055- -0x311,_0xcffc39);}function _0x3a27af(_0x24c83c,_0x43369b,_0x497824,_0x2f64fb,_0x1c0635){return _0x423b(_0x2f64fb- -0x3cc,_0x24c83c);}(function(){function _0x2a9438(_0x3b2b93,_0x137fd5,_0x148224,_0x41365f,_0x51e2c7){return _0x423b(_0x137fd5- -0x182,_0x3b2b93);}var _0x531c32={'fCoSB':function(_0x14207d,_0x9b42d3){return _0x14207d===_0x9b42d3;},'GYvdf':_0x92b422(0x2eb,0x21f,0x31d,0x1eb,'c7t)'),'IVKxJ':_0x50baa3(0x270,0x284,0x203,0x242,'SWag')+_0x92b422(0x23e,0x2f2,0x15a,0x289,'VxGk')+_0x92b422(0x2f3,0x1fa,0x3a0,0x285,'c7t)')+')','bdrrO':_0xcedb42(-0xb6,-0x92,'7IMH',0xaa,-0x38)+_0x2a9438('mxuA',-0x2f,0xfe,-0x139,-0x75)+_0xcedb42(0xe0,-0x48,'pEIx',0x1a,0x149)+_0x2a9438('c7t)',0xe,0x10b,-0xc1,0x12e)+_0xcedb42(-0xdf,-0x121,'ZNxD',-0x42,-0x4b)+_0xcedb42(0x74,0x16e,'lQME',0x199,0x73)+_0x50baa3(0x263,0x1bc,0x3ae,0x1e1,'qLLI'),'XYWZO':function(_0x58ff25,_0x4ebaa5){return _0x58ff25(_0x4ebaa5);},'mWajH':_0x2e683a('85gp',0x262,0x269,0x1ef,0x278),'uBUnI':function(_0x1aecd2,_0x28ac23){return _0x1aecd2+_0x28ac23;},'QLjCS':_0x2a9438('GxZA',-0x37,0x6,-0x3c,0xdd),'SLYZe':_0x2a9438('JamP',0x1f4,0xfa,0x25c,0x208),'LWNFN':_0x2a9438('@e1l',0x1de,0x11e,0xc8,0x2b5),'DyvKb':_0x2a9438('ewP#',0x202,0x285,0x2c5,0x299),'srvPr':_0x92b422(0x354,0x44a,0x45a,0x372,'8M[R'),'VKPKe':_0x92b422(0x395,0x4a8,0x38b,0x46f,'txUK'),'PIGUm':function(_0x19e737){return _0x19e737();},'ugtlT':function(_0x4e94b6,_0x17c22f,_0x12d67a){return _0x4e94b6(_0x17c22f,_0x12d67a);}};function _0xcedb42(_0x19a16b,_0x508011,_0x5b85b1,_0x169d1f,_0xaeca99){return _0x423b(_0x169d1f- -0x199,_0x5b85b1);}function _0x50baa3(_0x2ffa6a,_0x19e991,_0x1c1804,_0x157bce,_0x31f796){return _0x423b(_0x2ffa6a-0x6e,_0x31f796);}function _0x92b422(_0x523c62,_0x459c4f,_0x5acf97,_0x4ed2b7,_0x484b0c){return _0x423b(_0x523c62-0x3d,_0x484b0c);}function _0x2e683a(_0x1d5e3c,_0x1289f8,_0x5cd235,_0x5dbac8,_0x3520a0){return _0x423b(_0x3520a0-0xf6,_0x1d5e3c);}_0x531c32[_0x92b422(0x180,0x3a,0x136,0x29d,'JQN!')](_0x5d0845,this,function(){function _0x3a5a1f(_0x5ed83a,_0x286776,_0x4c8a06,_0xe0527b,_0x34966f){return _0x2e683a(_0x4c8a06,_0x286776-0x78,_0x4c8a06-0x128,_0xe0527b-0x49,_0xe0527b- -0x27a);}function _0x1b53df(_0x231745,_0xaa08c5,_0x1fa93e,_0x5d43b3,_0x18137e){return _0x2a9438(_0x18137e,_0xaa08c5- -0x221,_0x1fa93e-0x13d,_0x5d43b3-0x4c,_0x18137e-0x199);}function _0x5c4652(_0xcc6b0d,_0x436b4b,_0x26220c,_0x272ab7,_0x1ed249){return _0x2a9438(_0x436b4b,_0x26220c-0x48a,_0x26220c-0x157,_0x272ab7-0x127,_0x1ed249-0x100);}function _0x66e485(_0x19a33c,_0x31c151,_0x5b33ff,_0xe18d49,_0x36e380){return _0x2a9438(_0x19a33c,_0x36e380-0x1f8,_0x5b33ff-0x89,_0xe18d49-0x33,_0x36e380-0xc2);}function _0x2695d6(_0x4b5993,_0x490b4f,_0x218e2a,_0x507ce3,_0x5087ab){return _0x92b422(_0x4b5993-0x169,_0x490b4f-0x1a8,_0x218e2a-0xb8,_0x507ce3-0x172,_0x507ce3);}if(_0x531c32[_0x5c4652(0x520,'txUK',0x49d,0x5e2,0x404)](_0x531c32[_0x1b53df(-0x2e7,-0x20a,-0x219,-0x343,'txUK')],_0x531c32[_0x1b53df(-0x12b,-0x94,-0x1dd,0x16,'ZNxD')])){var _0x59bff7=new RegExp(_0x531c32[_0x1b53df(-0xb9,-0x1bf,-0x189,-0xf6,'B)X1')]),_0x445e7b=new RegExp(_0x531c32[_0x1b53df(-0x23a,-0x27a,-0x35d,-0x241,'8M[R')],'i'),_0x2d2fbd=_0x531c32[_0x5c4652(0x4c9,'&^zW',0x55d,0x5cc,0x6a6)](_0x4c2633,_0x531c32[_0x2695d6(0x4fd,0x3af,0x5b5,'pEIx',0x646)]);if(!_0x59bff7[_0x5c4652(0x776,'[0ti',0x6b7,0x673,0x5bf)](_0x531c32[_0x66e485('EBKt',0x3e0,0x453,0x564,0x404)](_0x2d2fbd,_0x531c32[_0x5c4652(0x525,'85gp',0x586,0x54e,0x424)]))||!_0x445e7b[_0x2695d6(0x2c4,0x1bd,0x35c,'ZNxD',0x251)](_0x531c32[_0x3a5a1f(-0x3e,0xb5,'yIr&',0xf9,0x1d2)](_0x2d2fbd,_0x531c32[_0x5c4652(0x5ac,'mxuA',0x4db,0x49c,0x4aa)])))_0x531c32[_0x5c4652(0x540,'@e1l',0x528,0x4ec,0x4fe)](_0x531c32[_0x2695d6(0x42f,0x304,0x34a,'3u1z',0x2f1)],_0x531c32[_0x1b53df(-0x193,-0x144,-0x115,-0x28d,'JCUG')])?_0x231881=_0x2d90b1:_0x531c32[_0x2695d6(0x4ea,0x497,0x38f,'JamP',0x45e)](_0x2d2fbd,'0');else{if(_0x531c32[_0x66e485('JQN!',0x1da,0x30f,0x33c,0x306)](_0x531c32[_0x2695d6(0x43b,0x307,0x500,'noK$',0x440)],_0x531c32[_0x1b53df(0x26,-0x60,-0x66,-0x68,'4u%w')])){var _0x2933ab=_0x663911?function(){function _0x2ac760(_0x411868,_0x36ade4,_0x140f1a,_0x17e017,_0x94ff7e){return _0x5c4652(_0x411868-0xff,_0x17e017,_0x36ade4-0x0,_0x17e017-0x1ab,_0x94ff7e-0x1ce);}if(_0x553672){var _0x48f7da=_0x328d1c[_0x2ac760(0x7ec,0x6ba,0x7d3,'VxGk',0x78b)](_0x1f177c,arguments);return _0x2f38fc=null,_0x48f7da;}}:function(){};return _0x56087c=![],_0x2933ab;}else _0x531c32[_0x66e485('mPuz',0x439,0x440,0x423,0x3dd)](_0x4c2633);}}else return _0x6eaa59;})();}());var _0xae6a99=(function(){function _0x4a52a5(_0x25f629,_0x24798b,_0x59ada1,_0x567565,_0x26a7c9){return _0x423b(_0x567565-0xc0,_0x25f629);}function _0x1cf6f9(_0x1bebd5,_0x2c5613,_0xa70f3,_0x55a60e,_0x26e451){return _0x423b(_0xa70f3- -0x118,_0x2c5613);}function _0x3249d9(_0x294937,_0x12d00a,_0x302856,_0x25688b,_0x16828b){return _0x423b(_0x294937- -0x199,_0x12d00a);}var _0x161030={'bCJqh':function(_0xdd4d6b){return _0xdd4d6b();},'OEEQk':_0x3249d9(0x14c,'z]Mc',0x39,0x1e7,0xbf)+_0x1cf6f9(0x92,'GJxH',0xa7,-0x1f,-0x1b)+'5','lIKLs':function(_0x375d34,_0x1641c2){return _0x375d34===_0x1641c2;},'mQFyH':_0x3249d9(0x1c8,'l56y',0xd4,0x18e,0x26c),'ThKNS':function(_0xdbc831,_0x3bcaa3){return _0xdbc831!==_0x3bcaa3;},'ZcuAj':_0x4a52a5('*URg',0x30a,0x353,0x2ce,0x25a),'Mzhzt':_0x3249d9(0x8a,'qLLI',-0x98,0x1ec,-0xda),'wyvyF':_0x15569e(0x683,0x553,'7IMH',0x407,0x509)},_0x238fb5=!![];function _0x3559e9(_0x4d80aa,_0x3ed915,_0x4a9163,_0x594899,_0x3f0986){return _0x423b(_0x4d80aa-0x234,_0x4a9163);}function _0x15569e(_0x3c13ee,_0x4e2c23,_0x5ecc6c,_0x488586,_0x47e91c){return _0x423b(_0x4e2c23-0x3d0,_0x5ecc6c);}return function(_0x5d47db,_0x48d82f){function _0x4031ff(_0x489e46,_0x42037b,_0x2c8c00,_0x5b3875,_0x2b3c6f){return _0x4a52a5(_0x2c8c00,_0x42037b-0x1e0,_0x2c8c00-0x7a,_0x42037b-0x1c5,_0x2b3c6f-0x1b0);}function _0x4fffb7(_0x183f00,_0xc19f94,_0x295d4f,_0x20e4b5,_0x2f82b1){return _0x4a52a5(_0x2f82b1,_0xc19f94-0xe4,_0x295d4f-0x182,_0xc19f94- -0x2bb,_0x2f82b1-0x8c);}function _0x50596c(_0x367358,_0x2e9d5a,_0x30f84a,_0x9888b,_0x403367){return _0x3559e9(_0x9888b- -0x610,_0x2e9d5a-0x198,_0x367358,_0x9888b-0x22,_0x403367-0x16b);}var _0x4c035f={'OBrVF':function(_0x22be77){function _0x1fecff(_0x4c4b91,_0x4b0cdc,_0x3c870e,_0x1c90f2,_0xc9e5f9){return _0x423b(_0x1c90f2-0x342,_0x4c4b91);}return _0x161030[_0x1fecff('85gp',0x308,0x51a,0x46a,0x437)](_0x22be77);},'InoaR':_0x161030[_0x50596c('JCUG',-0x7,-0x73,-0x168,-0x95)],'KoKJI':function(_0x477126,_0x1e18da){function _0x78231b(_0x2d451d,_0x4430c1,_0x2c2d29,_0x31e4ae,_0x4ec95d){return _0x50596c(_0x4430c1,_0x4430c1-0x10,_0x2c2d29-0x7f,_0x31e4ae-0x11c,_0x4ec95d-0x12a);}return _0x161030[_0x78231b(-0x155,'JamP',-0xb9,-0xa8,0x47)](_0x477126,_0x1e18da);},'YbMhH':_0x161030[_0x50596c('SZ%O',-0xec,-0x1a9,-0x212,-0x2d8)],'RmumQ':function(_0x3e461c,_0x29eb64){function _0xa468e3(_0x7c416e,_0x456e54,_0x3f6ddb,_0x525594,_0x496a77){return _0x5ee1b9(_0x3f6ddb,_0x456e54-0x4,_0x496a77- -0x4db,_0x525594-0xc0,_0x496a77-0xf3);}return _0x161030[_0xa468e3(0x8,-0x15b,'hJ0p',-0xe9,-0x127)](_0x3e461c,_0x29eb64);},'geMlq':_0x161030[_0x5ee1b9('%)hU',0x56e,0x4e6,0x5cc,0x554)]};function _0x39d042(_0x50aa2b,_0x16d481,_0x57e0f7,_0x34c9bf,_0x1595f5){return _0x15569e(_0x50aa2b-0x10b,_0x1595f5- -0x338,_0x34c9bf,_0x34c9bf-0x63,_0x1595f5-0x152);}function _0x5ee1b9(_0x1a711b,_0x183676,_0x3bcd82,_0x5cb00d,_0x205e43){return _0x1cf6f9(_0x1a711b-0x15d,_0x1a711b,_0x3bcd82-0x276,_0x5cb00d-0x9c,_0x205e43-0x135);}if(_0x161030[_0x5ee1b9('85gp',0x3cb,0x4a6,0x4b6,0x51b)](_0x161030[_0x5ee1b9('uyNn',0x454,0x428,0x48c,0x49e)],_0x161030[_0x4fffb7(0x5a,0x31,0x14,0x3f,'z]Mc')])){var _0x51ec71=_0x238fb5?function(){function _0x31a801(_0x338876,_0x500a19,_0x343a61,_0x259d58,_0x356081){return _0x5ee1b9(_0x338876,_0x500a19-0x155,_0x343a61- -0x23e,_0x259d58-0x13d,_0x356081-0x1e2);}function _0x10bd71(_0x297725,_0xc8fbdf,_0x5e5813,_0x497ef5,_0x41124d){return _0x4031ff(_0x297725-0x36,_0x497ef5- -0xee,_0x297725,_0x497ef5-0xa9,_0x41124d-0xf0);}function _0x2b0b71(_0x18cb6f,_0x29667d,_0x30809a,_0x439278,_0x347d2d){return _0x39d042(_0x18cb6f-0x93,_0x29667d-0x1e7,_0x30809a-0x6b,_0x29667d,_0x347d2d- -0x3a0);}function _0x5ed283(_0x4cb7f3,_0x477e92,_0x7e917a,_0xfe36b4,_0x1a5566){return _0x4fffb7(_0x4cb7f3-0x5a,_0x7e917a-0x222,_0x7e917a-0x121,_0xfe36b4-0xb,_0x4cb7f3);}function _0xaf7305(_0x4cfe1f,_0x10e11e,_0x10419c,_0x492921,_0x1944c4){return _0x4031ff(_0x4cfe1f-0x1c4,_0x1944c4-0xb8,_0x492921,_0x492921-0xca,_0x1944c4-0x194);}if(_0x4c035f[_0x31a801('z]Mc',-0x45,0xcf,0x184,0x16d)](_0x4c035f[_0x31a801('%)hU',0xc2,0x97,0x119,0x180)],_0x4c035f[_0xaf7305(0x354,0x4b3,0x5a2,'%)hU',0x4b4)])){if(_0x48d82f){if(_0x4c035f[_0x31a801('mO5$',0x138,0xd6,0xc1,0x92)](_0x4c035f[_0x2b0b71(-0x2d1,'@jb4',-0x40,-0x2bf,-0x1a0)],_0x4c035f[_0x5ed283('mPuz',0x27f,0x326,0x331,0x3b0)]))_0x4c035f[_0x2b0b71(-0x13c,'SWag',0xe,-0x131,-0x127)](_0x18c278);else{var _0x4c3187=_0x48d82f[_0x31a801('EBKt',0x5d,0x19f,0x2cf,0xfb)](_0x5d47db,arguments);return _0x48d82f=null,_0x4c3187;}}}else{var _0x9aff90=_0x4c035f[_0x2b0b71(0x7,'z]Mc',-0x11e,-0x19b,-0x5c)][_0x2b0b71(0x43,'[0ti',-0x12e,0x5a,-0xb1)]('|'),_0x510bde=-0xdfc+-0x5*-0x499+0x901*-0x1;while(!![]){switch(_0x9aff90[_0x510bde++]){case'0':_0x103909[_0x2b0b71(-0x2d5,'[0ti',-0x1e2,-0x300,-0x1c9)+_0xaf7305(0x543,0x4c9,0x699,'GxZA',0x5c2)]=_0x24d375[_0x2b0b71(-0xfc,'uyNn',-0x2aa,-0xd0,-0x169)+_0x10bd71('qLLI',0x28c,0x2a3,0x3b4,0x3d2)][_0x10bd71('SWag',0x2e9,0x34c,0x40f,0x3c7)](_0x24d375);continue;case'1':var _0x24d375=_0x25f1e9[_0x3e4f6a]||_0x103909;continue;case'2':_0x103909[_0xaf7305(0x6eb,0x6a6,0x636,'B)X1',0x644)+_0x5ed283('%)hU',0x364,0x328,0x435,0x252)]=_0x3c488e[_0xaf7305(0x522,0x5f3,0x700,'hJ0p',0x609)](_0x17ac6f);continue;case'3':var _0x103909=_0x3be0ea[_0x31a801('8M[R',0xb2,0x96,0x186,0x134)+_0x5ed283('LFv)',0x447,0x324,0x3b2,0x44a)+'r'][_0x5ed283('8M[R',0x154,0x13b,0x146,0xb)+_0x5ed283('WbEt',0x4ab,0x38a,0x227,0x2a4)][_0x31a801('noK$',0x119,0x18a,0x168,0x1a9)](_0x18cb1f);continue;case'4':var _0x3e4f6a=_0x2616e3[_0x4d0751];continue;case'5':_0x23e099[_0x3e4f6a]=_0x103909;continue;}break;}}}:function(){};return _0x238fb5=![],_0x51ec71;}else{var _0x3cd31c=_0x4d4ce3[_0x50596c('@jb4',-0x256,-0xa7,-0x105,0x2b)](_0x3f71f3,arguments);return _0xf88fc9=null,_0x3cd31c;}};}()),_0x33f23a=_0xae6a99(this,function(){var _0x4be2cf={'kPZRK':function(_0x250cc5,_0x4200c5){return _0x250cc5+_0x4200c5;},'KZHpg':_0x30f36d('8M[R',0x289,0x2d6,0x3d2,0x310),'WRivd':_0x5155a6(0x2bf,'c7t)',0x175,0x30f,0x163),'ArGvm':_0x30f36d('f&u#',0x25f,0x260,0x30e,0x1a1)+_0x17379c(-0x38,-0xb8,'3u1z',0x8f,0x1b5)+'t','DBCQd':function(_0x1ea523,_0x2a140e){return _0x1ea523===_0x2a140e;},'DGzYL':_0x1c2aaf('4u%w',0x4cd,0x424,0x375,0x4c0),'mwXAA':_0x1c2aaf('WbEt',0x2f2,0x3e7,0x2d6,0x339),'HTQaH':function(_0x4bd1a4,_0x30f5be){return _0x4bd1a4(_0x30f5be);},'iJLUx':function(_0x29c4d4,_0x19e0bb){return _0x29c4d4+_0x19e0bb;},'aidsK':_0x13dd2a(0x2c1,'f&u#',0x37e,0x43a,0x399)+_0x13dd2a(0x28a,'mxuA',0x1f5,0xc8,0x25c)+_0x13dd2a(0x1c1,'3u1z',0x2a3,0x2da,0x34b)+_0x30f36d('GxZA',0xd6,0x22d,0x1e9,0x2b5),'SNEAw':_0x5155a6(0x7c,'mxuA',-0xb6,0x4d,-0xb3)+_0x30f36d('ZNxD',0x330,0x398,0x468,0x26a)+_0x30f36d('pEIx',0x42b,0x348,0x29f,0x313)+_0x5155a6(0x26c,'dm9X',0x1e2,0x3c8,0x225)+_0x5155a6(0x267,'bs[s',0x12c,0x1e7,0x2de)+_0x13dd2a(0x391,'z]Mc',0x2e3,0x2f8,0x367)+'\x20)','NXVfE':_0x5155a6(0x2ba,'f&u#',0x335,0x35c,0x1e0),'tueBY':function(_0x348a4){return _0x348a4();},'lLmfo':_0x5155a6(0x1bb,'WkkZ',0x152,0x1a0,0x308),'dmLHX':_0x5155a6(0x259,'869(',0x2d4,0x179,0x12b),'DRcEo':_0x5155a6(0x2fa,'85gp',0x241,0x2ee,0x33b),'uziPZ':_0x5155a6(0xf6,'8M[R',0x19a,0x126,0xb3),'lTNYQ':_0x13dd2a(0x2a7,'lQME',0x325,0x1fc,0x34c)+_0x1c2aaf('SWag',0x3ae,0x4b2,0x436,0x35f),'ewOtr':_0x13dd2a(0x402,'mO5$',0x35a,0x352,0x3dd),'yfMDr':_0x5155a6(0x166,'8p1v',0x3a,0x102,0x124),'nGQmH':function(_0xabdd10,_0x760bbf){return _0xabdd10<_0x760bbf;},'WsJQY':function(_0x23809e,_0x3911a1){return _0x23809e!==_0x3911a1;},'XBHEm':_0x30f36d('lQME',0x3d2,0x396,0x36a,0x363),'DNnLG':_0x30f36d('SZ%O',0x22b,0x363,0x46c,0x472),'yGozv':_0x30f36d('LFv)',0x4bd,0x387,0x49b,0x427)+_0x17379c(-0xdb,0x72,'JQN!',0x70,-0xd4)+'1'};function _0x17379c(_0x118b50,_0x5470d6,_0x48fe84,_0x1057f9,_0x3ffaa9){return _0x423b(_0x1057f9- -0xf7,_0x48fe84);}function _0x13dd2a(_0x1ead63,_0x5347e0,_0x26c617,_0x21518e,_0x2f6e41){return _0x423b(_0x26c617-0xb0,_0x5347e0);}function _0x5155a6(_0x111c46,_0x47dff2,_0x242a05,_0x15e9de,_0x2718db){return _0x423b(_0x111c46- -0xb1,_0x47dff2);}var _0x371357=function(){function _0x50551b(_0x2c2cff,_0x1dfd40,_0x503a2a,_0x21e6df,_0x58235b){return _0x17379c(_0x2c2cff-0x15,_0x1dfd40-0xd1,_0x503a2a,_0x21e6df-0x3c6,_0x58235b-0x1dc);}function _0x4f0691(_0x156201,_0x183022,_0x48198c,_0x248b80,_0x5ae205){return _0x30f36d(_0x5ae205,_0x183022-0x175,_0x183022-0xe9,_0x248b80-0xa7,_0x5ae205-0x16b);}function _0x65659d(_0x246064,_0x58d711,_0x292d84,_0x347bc0,_0x54705f){return _0x30f36d(_0x292d84,_0x58d711-0x1b5,_0x54705f-0x159,_0x347bc0-0x95,_0x54705f-0x5a);}function _0xb0b8c7(_0x1e734b,_0x40352b,_0x275562,_0x2f8cf1,_0x350e0f){return _0x17379c(_0x1e734b-0x198,_0x40352b-0x1bc,_0x275562,_0x1e734b- -0xa8,_0x350e0f-0x7a);}function _0x41550e(_0x4020cf,_0x5c7262,_0x4089fc,_0x66e233,_0x1ac63f){return _0x30f36d(_0x4089fc,_0x5c7262-0x96,_0x4020cf-0x136,_0x66e233-0x1da,_0x1ac63f-0x105);}if(_0x4be2cf[_0x50551b(0x4b2,0x4dc,'SWag',0x4de,0x41c)](_0x4be2cf[_0x4f0691(0x3a8,0x31b,0x39a,0x1ff,'JCUG')],_0x4be2cf[_0x4f0691(0x28e,0x2dc,0x38e,0x18f,'@jb4')])){var _0x3fc6a5;try{_0x4be2cf[_0x4f0691(0x1a7,0x2a2,0x2b4,0x3b9,'869(')](_0x4be2cf[_0xb0b8c7(-0x8e,-0xd4,'SWag',-0x1b2,-0x7e)],_0x4be2cf[_0xb0b8c7(0xa,-0x13a,'l56y',0x126,-0x134)])?_0x3fc6a5=_0x4be2cf[_0x41550e(0x331,0x1d8,'@jb4',0x253,0x447)](Function,_0x4be2cf[_0x65659d(0x48d,0x4bf,'8M[R',0x56a,0x4e2)](_0x4be2cf[_0x65659d(0x31f,0x214,'z]Mc',0x3f1,0x314)](_0x4be2cf[_0x4f0691(0x494,0x482,0x4f6,0x3fd,'hJ0p')],_0x4be2cf[_0x4f0691(0x519,0x492,0x5ea,0x441,'WkkZ')]),');'))():_0x4274f6=_0x3de1f4;}catch(_0x22e8a9){_0x4be2cf[_0xb0b8c7(0x1b,0x2c,'JamP',0xcf,-0x12b)](_0x4be2cf[_0x65659d(0x5aa,0x4fd,'VxGk',0x408,0x514)],_0x4be2cf[_0x41550e(0x4f1,0x47f,'VxGk',0x39a,0x62f)])?_0x3fc6a5=window:function(){return![];}[_0x50551b(0x495,0x54c,'&^zW',0x5c1,0x70e)+_0x65659d(0x64c,0x660,'noK$',0x63d,0x540)+'r'](_0x4be2cf[_0x50551b(0x4c5,0x576,'@jb4',0x59c,0x4e9)](_0x4be2cf[_0x4f0691(0x598,0x4a8,0x5f1,0x557,'z]Mc')],_0x4be2cf[_0x41550e(0x4dd,0x446,'ewP#',0x4e1,0x62a)]))[_0x41550e(0x3cb,0x2aa,'4u%w',0x34c,0x2b7)](_0x4be2cf[_0x4f0691(0x17e,0x2bb,0x245,0x3c5,'8p1v')]);}return _0x3fc6a5;}else{if(_0x3518f8){var _0x4d8eb5=_0x4edbbe[_0x65659d(0x468,0x334,'8p1v',0x4f7,0x3c0)](_0x16a4e7,arguments);return _0x550bfd=null,_0x4d8eb5;}}},_0x32db00=_0x4be2cf[_0x30f36d('z]Mc',0x256,0x290,0x320,0x34a)](_0x371357),_0x1ab2c3=_0x32db00[_0x13dd2a(0x112,'&^zW',0x1bd,0x1af,0x6b)+'le']=_0x32db00[_0x5155a6(0x29c,'noK$',0x39d,0x2bc,0x302)+'le']||{},_0xa5ae2=[_0x4be2cf[_0x5155a6(0xec,'LFv)',0x11a,0x1c0,0x11e)],_0x4be2cf[_0x1c2aaf('WbEt',0x4f9,0x588,0x46d,0x56a)],_0x4be2cf[_0x13dd2a(0x299,'Fwz5',0x2ac,0x3a1,0x2b9)],_0x4be2cf[_0x5155a6(0x1b1,'dm9X',0x1fa,0x18e,0x62)],_0x4be2cf[_0x5155a6(0x1e6,'8p1v',0xd9,0x348,0x230)],_0x4be2cf[_0x1c2aaf('WbEt',0x2cb,0x2cb,0x1fb,0x215)],_0x4be2cf[_0x13dd2a(0x1e0,'869(',0x1f4,0x138,0x192)]];function _0x1c2aaf(_0x5e2610,_0x82a59,_0x5a01f9,_0x2e801d,_0x5cf843){return _0x423b(_0x2e801d-0xad,_0x5e2610);}function _0x30f36d(_0x969fd7,_0x50d016,_0x516f60,_0x1d9cc2,_0x527d66){return _0x423b(_0x516f60-0x60,_0x969fd7);}for(var _0x2c7bb7=-0x115f+0x1*-0x168d+0x23*0x124;_0x4be2cf[_0x30f36d('JamP',0x33d,0x31b,0x337,0x441)](_0x2c7bb7,_0xa5ae2[_0x1c2aaf('LFv)',0x354,0x485,0x465,0x48b)+'h']);_0x2c7bb7++){if(_0x4be2cf[_0x1c2aaf('B)X1',0x303,0x51c,0x3e9,0x4fc)](_0x4be2cf[_0x5155a6(0x2a9,'GJxH',0x2d3,0x25f,0x2bb)],_0x4be2cf[_0x13dd2a(0x425,'@e1l',0x42d,0x4ee,0x386)])){var _0x4b1ce3=_0x4be2cf[_0x1c2aaf('JamP',0x48d,0x34c,0x475,0x4bb)][_0x17379c(0x1f0,0x1cc,'SWag',0x1d8,0x11f)]('|'),_0x8cbec5=0x3c4*0x5+0xca6*-0x1+-0x62e;while(!![]){switch(_0x4b1ce3[_0x8cbec5++]){case'0':var _0x48415b=_0x1ab2c3[_0x4a026d]||_0x196221;continue;case'1':_0x1ab2c3[_0x4a026d]=_0x196221;continue;case'2':_0x196221[_0x13dd2a(0x2c2,'noK$',0x2cb,0x3c5,0x362)+_0x30f36d('SWag',0x2ff,0x3a5,0x3a7,0x449)]=_0x48415b[_0x1c2aaf('85gp',0x26e,0x2d6,0x2bd,0x1db)+_0x1c2aaf('&^zW',0x2ce,0x452,0x3a8,0x4d9)][_0x1c2aaf('B)X1',0x38e,0x3df,0x39b,0x4bc)](_0x48415b);continue;case'3':var _0x4a026d=_0xa5ae2[_0x2c7bb7];continue;case'4':_0x196221[_0x1c2aaf('yIr&',0x32e,0x3ad,0x288,0x268)+_0x13dd2a(0x40f,'Yum8',0x375,0x443,0x335)]=_0xae6a99[_0x1c2aaf('*URg',0x37c,0x44c,0x41a,0x469)](_0xae6a99);continue;case'5':var _0x196221=_0xae6a99[_0x17379c(0x1af,0x345,'SWag',0x24a,0x364)+_0x5155a6(0xce,'WkkZ',0x11,0x206,0x196)+'r'][_0x30f36d('7IMH',0x246,0x2d0,0x267,0x207)+_0x17379c(0xdf,0x2b4,'@jb4',0x1c2,0x31b)][_0x17379c(0xf4,0x25e,'hJ0p',0x1d5,0xfa)](_0xae6a99);continue;}break;}}else{var _0x559f36=_0x31d2c8[_0x1c2aaf('noK$',0x430,0x40c,0x398,0x3a6)](_0x178dae,arguments);return _0x1a041b=null,_0x559f36;}}});function _0x518a(){var _0x592ff5=['W5WOoNpcHW','WRm0nSoRWQS','sSkWWPbbsq','c8kOWQihxWX9WRddJ8oYdweLdq','BmkwWOlcI8kL','t8kyWRiZWPq','Emo4iGNcMSoouSkUW5VdVmo5W5hdSW','E8oZFgu','W6pdS8ovdCoH','F8kBWROoW5JdQdXWnSo/uM8','WRK1pW','WRCAuSkMWR0','bXFdQ3ms','d8k5WO5xCG','pLavq3i','WOJdLIZcImk7','hSoOWODW','wmk+W6ODWQRdPevuFthdJSk+y1u','WONcVZ3dSJ4','pCkAWQTarq','WOZcLgNdRmor','omkQzuS','W5BcUu1Ola','iHBdJgS/','WO80q8kUWRu','WQBdVhae','W5/dO8ouk8oB','AmorWOhcSCk5','WPRcI2JcVmkr','oSojjmoDW4biW4e6bMVdIZOp','kSoUW6PbpW','l8kNpSoh','e8kSD0/dTW','xSkeWOD5zW','WPhcJIXMya','ytzTW43cTa','rSoTt3xcQG','wvvSW4ZcMa','WQTSW5tcQ8kg','W4RcGbZdPwu','WPzTAuuj','WQ94W4WlgG','A8oyWP5/W5K','W6uYkx3cRq','W5xcMYldU8ol','W7hdUWZcKgi','WQb0WOfkga','W77dIe91iq','fmo7WOi','W7PLhCoKWQu','qNBcRa00','vSo8W7pdUSk5','jCkHCq','iCo+WP4yWOhcV8kBWOe','qb7cU3Tn','rSoSW5ZdJCkv','WQrLW4BcSSkP','iCkby0FdNW','WPtcUWbmBa','WQ4zwvZcTq','WOv/B8k5W5W','WQGajCkcWPi','W4GOmNBcJa','W5RdJIVcO38','WPJdHKJdO3G','WOLUW7S0kG','W7OruCoaWOa','WPu7xmkbWRC','bSkVWQn/CW','WRDGWOaPpW','W43dOZxcJvS','a8oeW6Hxla','WRngEmkeW5i','vSocW7HHaG','WPvsbHum','W57cLxDlgG','hH4tWPJdRW','FxBcLIHY','cKGsW6dcSq','cKeRw1K','WQyfgb7dSa','iJldU0K4','wJZcQIJdSa','tCksWO4oWQK','WQWeeq','WPm5WRavWOG','WRm/WQS0WOO','fL54W7ZdOa','ae4hW7JcJW','jSoAW75hWP4','vmkdWPZcNSkh','WRTaCSoxWRm','WPWDiSkPWQq','WOrLW7tcPmk3','ExNcMCkJW4G','cCobWOj+W5W','WQfWW4tcRCkG','C3BcIG','W6ZcVaBcJ2u','WOSEl8kkWRG','ihqWW5dcLG','mmoCW43dS8kg','D0/cJmkGW68','WQRcRddcJCkg','WPjpoJ0V','ymkjWRiYsa','uSomt3hcQW','gSkHwhRdNW','yCoeWQnOW4y','cCk+D0xdHW','C8kFWRTfqq','WOP+thS2','eX9+qJm','WQRcTYddQcK','W5JdRCk7vW','eu01w2W','wCk1WPOAuq','W43dPmkuw8kH','cxWFEM4','t8oWW7XacW','WPOwjCk7W6u','imkIWRHlzq','vmoaW7NdOSkv','W6pcLYldHqW','wmo7WRtcTW','imoiW5n2WRu','WRjTe8ogWQy','W67dRCoslq','WP8UmCoaWQ8','bCodW6HvkG','WPfVFh7cKG','xJBcSIVdNq','umo5W6r0hW','FmkLWQKHWPi','ySkIWRi9WOS','ehXmvKK','BmkiWOTMta','nLnbW4tdKG','WRJcV8khzSkhWQNcIeysa0xcTq','W6CrfmoSWQKzW40','WQbwzh0H','k8kPx3ddRq','wCoMWRxcOCkD','hSo/W6nFWRu','WQP9W48Zoq','WRjVbdqi','iSkHWPvUxa','WQW8WOKMWOG','WOD3zX4j','WOWZxSkeWO8','WO0hl8kUWQq','mmoKWQ1UW7e','WRedgqm','W7uAWRpcL8kv','iwu2W4ZcIG','WRrSac8','ASofWQVcLmoV','W6LGk8oGWOG','p8k7D0VdJq','WQKRpGpdQa','WQbtEKyk','W4RcVcddMtK','a8kTFfRdIW','WQycfWtdQG','oIjrxsS','p8opu8kIWPyHWP0m','B8ktDCobWPi','W5ZdUCoslCo8','zCkBFCkcWQq','ymk2WOjcBq','DmkQWRmfWQC','ySkQWQ4AWPu','hmkkWQVcQSoy','wSkNWPupEG','W6ZdUmoEmCou','WP04WPi4WQC','WQGOhCk+WQq','w8ovEKtcPG','WQ4GxSk5WO8','gCo7W7T8la','bG/dVuiA','WQeAW7BcK8kn','zfpcQJ1n','WQDbW6JcKmkr','WRBcJtT1rq','W4qHa3BcRW','k1HvW50','qKnyW7a','imoKWPP/W4W','WPzsi8oqWQO','oSolW7Ld','omoeW7LxnW','hJWzFWS','FCoKAxVcLW','WQK+aCotWPy','s8obWOHZW6y','W4KPp3RcGW','WRL7BSk2W5O','u8ohxftcUW','gqFdPMaj','WQXQxCknW6O','WPLjgsWk','CSkvv8k3WPq','AhBdJCk+W48','dmotWOTNW7y','WP7cNYJcImoN','fHRdHKjf','W4JdUCkhESkA','WOvahdal','rKJcQqzy','W6ddSaFcKgm','W6/dIhK9bfCyW5vgW6hdMa','F8k/WQTuya','WR4xwa7dQW','wmk/W6ezWQS','BmkmWRyUWPa','WRnKW40zrW','WRdcShGRW70','W6pdLqZcLwG','wmkvWP7cQmkZ','WO18mCogWQy','vCknWPe8Bq','yCkKWOOGWPq','WRnJbd4','WObaFSkcW6e','nX1XdW','o8kkWRVcNCoC','WRm0nSoRWRa','WOCmWQ4U','yrpcGYXG','W4tcVSo/oSoZ','WQGDlIZdHq','W5raW7SJW4m','FvFcJYX5','WR9hW7pcLmkn','a8kRW6NdP8kdtSo8omoEWRFcH3S','y8owWPdcOCo5','CCksWRHHBG','z8k7BSk7WQK','c1WYEMO','WOLQhdye','WObXAX4f','WRHTjbWa','Amo3WO7cUSo5','gCosW69r','W4/cLIFdUJO','WRTslYiZ','W6lcL1ldO2u','oCo5W5DRaq','W7WaWQtdMmotWPVdNSkfq8o4WRxcVq','WPrXjuqv','WP3cJcddTCoB','E0C9w3y','hgm2W5dcMW','ihv5W4pdMW','WQ1rW67cKSkT','Cmo7EhpdGa','oCkcWOxcOmo7','W67cKqpdUcW','wL8AW7/cUa','A8k6A3JcJa','u8kZWRjrAW','kmojW4b1WP0','hmkyW5KC','E8kfwKVdNSkskG','hmkEF1FdSa','i1vhW5VdNa','DCoHWOpcVCoB','WPvCWPKLja','W6SGtCkoWP4','tmknxSkyWPm','x8kJWOb5za','WPmDlCk+W6u','oCkTBLNdKG','WO58seqP','W7FcT3ldG0W','W7ikv8kU','oSobW5LdWP8','oqVdNh0LW7OfD8okW4RdQSoW','iHtcLq7cUG','ESkzWR4bW5/dRvTOmCoqBgnR','B8ktWOBcPCkj','WQJdU08UWQi','tWiCW7RcOG','WOauc8om','whFcSbW','W7bnbSkGWQi','heenW5BcJG','W4T5hSodW7m','WR5Qcdii','vSosWPjkW4y','WQVcRstdRs4','W4NdO8kerSkW','amk9W7xcPmoc','omkmWQXRFa','vSoAWRrLW6u','WR1Icq','cWOlWQBcJa','t8k/WPVcKCkz','iCodW6DyWOm','pva6wG','xCkAWQveDa','W73cN0DkkW','WPxdN0e7WRq','W7Hlh8kHWQi','uCkpWR9GxG','W7eFD0lcUq','W6BdVqhcJhG','umoHWRxcVq','B8oHWOZcO8ox','W5SdfxVcIq','vCkHWRZcJq','iCoxWRbRW44','WPdcSINcVCk4','BSkrWOdcV8k8','W4ldP8k/qmk3','WOtcJdpdHSoq','zSoaWO7dU8kH','BmkFwCkcWOa','kSkpW5hcVCo8','WPCNmW7dPW','tWBcKtRdRq','w8oGWRhdVSos','WQn+WR8glq','WRtcJIJcSCk5','W7xcGbBdUJW','iCkPyNNdHW','smkOq8kfWR0','EmoJW5DdaW','WOVcGHVcImkf','bqZdRW','DSogW7m','WQXAW7lcK8kw','m8oLWPvhW5m','tH/cOcBdVa','bumOW7dcNa','WO5Bn8o3WPa','WQ/cOaRdJGS','W6jSAmkTW64','zbBcTcVdHG','W6JcIeVdHw8','ixuHW43cLW','dCkWWR97uW','WQLVW4WsbG','k1HAW4y','WQHBm8oyWQ0','WQOCWRZcM8kF','W64NWPfqqa','W4NcHX3dRtW','CmoDW5fJkW','n8ofW79UWOG','ESk5WR57WPe','WQeDWRxdGa','WOPnW6OKWPS','qmkzWOhcGCkq','j8ofW6nhWOG','WOjbpCoxWOO','WOSHfCobW7i','W5pdLCktaSoP','W5NcIstcNCk8','zLhcNgT3','t8k9BSk3WR0','kmkiwvRdQG','WP3cUc7cUSkl','W7/dRCkyBSka','i8oTW6nOWQK','kSkOxh3dMa','WRZcOJFcJCkV','WQynuCo7WRe','q8kUrCkpWRK','W7tcKbtdVda','gs7dPwes','W6pcGr7dQxe','tCoBWRHZW7S','rCozW5FdJ8kV','oSoliSowW4mnWPiDjvJdOG','mSohW7beia','W6RcIvnPnW','W7iPpCoSWQO','ECktWP10ra','ySk8yfJcHG','WQPhW67cJ8kq','qgr/W5tcVG','hczUvIu','zSkAWQ4mWO4','WPzsar8Z','WPlcKJhdKri','W6RdSapcKhq','WRXCAmkfW6W','C8kQWRH/BW','WPy2g8oVWRW','Emo8WRpcL8oz','WRvKAmkhW44','EZxcL8klWOO','WOBcJZtdMSoN','EmojWRhdO8kZ','WOZcLdPOzW','imoDW75fWPG','f8o2WRf/bG','W4ddH8ovfmo/','uCkjWPOfWOi','W73cIw5Umq','W50HoqvqW6X9jSk8cCktEq','W6hcQe3dL0K','W6FdUCodlCoh','rmo5WOzhwq','W6FcHuLZla','nhqdW7lcOG','c8oqW5zNkq','vCoAW7Xacq','W6/dJSoKe8oe','omo/W7LRpG','WP0ApGldIW','c8o3WQHdW6i','W6G3wsKuWOjyWPvR','y0RcJdb2','WQ7cIbBdPbu','WQLoqLCv','WQb4aSoyWRW','WRmQqhS','W5NdNCoggmoO','W4hcI2xdMKq','WPy9zmkCWQG','DCo6Cgm','WOnlW4iIjq','CM5TW4BcSG','u8o8WR0','W6WmefJcIW','tSkiWRaHAG','WRJdNMChWRi','BmkkBCkbWPq','WPiRdSoCWPa','pmonW79XWRG','W5RdJr/cJwm','WPKrm8ooWPa','yIJcMa/dTa','W63dUcpcQ14','mCksW5pdOmk8','WOWHfbxdTG','WOOObdVdGG','pchdI2S4','p8kQD03dIW','W4dcShzIcq','amkGWR96dq','gMiLW73cLa','WR3cLIf2qG','gCo0W5TtWOi','W6ddTCktq8kY','WPj1cJGW','aW5FDaS','W4ddLCkdxmkU','uMdcI8kdW4u','WPzRD8ooW7i','WOiGWQKSWOu','gMGdW5dcOa','vCkKlvpdMq','WP3cSqNdOmoi','W6JcHGpdOta','ASkeWPdcR8k8','Fmk8W5VdOa','WPVcVIbWta','WRdcQctdNmo2','W5xdJNRdVNG','WRXZW5pcGCkj','WQ/cOdT0CG','FmoIl17cHq','kmkeWPH8Aq','WQfbW5mvaG','WP0Lms7dLa','gCo+W6TVWQq','CmoaW77dTmk5','DCo7DZFdHa','WQmFga7dSa','sCkYWRiIFW','WRXxga0w','W7pdK8oggSoe','lmoKytRcVa','wmoHW6bzfW','W7nqgCkHWRy','egG3W5BcQW','cXXZway','WRnzW78Zja','sCoDW6vSna','lxCrwua','ySo0WQVcNSo9','WOeOntZdOa','nLLGW4BdGq','WPn7AmkWW5C','s8oWW79Mha','rSkQv8k4WP0','WQr4W5Cjqq','cCoxW4bZWRS','o8koWP7cOSo9','tCoJW7fwcW','ECkcWPiyWPu','WRD+A3KK','W5pcVXpdNY0','WOSDh8kUWRK','s2RcKajA','mCkpWPy','W73dR8oekW','W7SNxCobWRu','WOjBzwiK','eJ5dEra','xSo0W6q','kSkqWRdcUCoo','omooWOX2WQy','W6tdOH/cK3u','W5VcIvXylq','ESk7WQWZAG','iKH2tgW','W7ZdRmkIvCkb','W4VdPqhcQfy','W4FdIxW','t8k8WOvmya','FmktWRJcI8kT','ymoYW4xdKCkB','W5GJpg3cHG','tmkWWPz3FW','zmkTWQObWR8','WOtdHJpdP8ol','uCk2W5eCdG','qCkzCCkRWQi','BqFcIG/dRa','WPnWy10d','AfBcN8kDW54','tSkOWPL8Cq','E3VcHSoKW5q','nSkjW59Kxq','rCkFWRqlCG','WQnPW5Oo','WOm/uG','WPRcLIq','uSk8WQTZuW','DmoGWQdcSCo6','W7icvSoOWRq','ASorW4hcUCoS','WP0JlSkFW6u','CmorW6VdICkY','v8oYW6rCaq','tCo+W4nbha','WRpcMcfWvW','ySkrFCkEWPq','fGNcPNql','o8kvWP7cU8k8','fwWJW7tcGG','t03cP2au','WQ1Uccid','mua6axa','cSoqW7Lx','nmo5W4f8WOu','WRKOESkXW7C','WRv2hsSv','kmkSqgBcNG','WRjWmComWO0','WOGcd8ocWPa','WOzhv8k5W4O','pCoEW6zEWPK','zCkElSoo','v8kXWRHtgW','WO0UWQCVWOW','WOT1jvWj','WRT/WRKGhW','WRecgCopWPO','mSk5WR/cPSoI','WOn1W44WcW','WQXKW7hcT8kx','W7RcKfO1CG','WOlcKY7dN8oK','WOxdTxChWRi','jW3dQMSs','WOP7Bxin','FSoqW7nMjG','x8kIWPWo','cCoZWRDDWRm','W6JcUXDstG','WP0BiSk+','W6VcSI0FWQa','p28L','EHBcLHBdSa','WOqbd8okWQu','ECkunmkAWPK','WRf6hCoaWQO','Dmk7WQK4WP8','WOtcVZ7dGCon','xCk3WQXCrq','WOHjW70QaG','WPzxWRulbq','WQTqW77cLq','oG7dM04y','WQCdgaK','f3Omd0u','W5tcIHxdVsC','W6JdHv/dRIO','smoNWRNcP8oA','W7ddKdRcKuu','e3PzW7hdOa','W71sdSoIWRG','W5Gkbv3cHW','ySk5WQVcKCkS','cmoZW4CdeG','W77dKtT3qW','ASoAW6/dTCkO','WRrSdG','umoGW7D9oq','WRT5W7VcUCkx','W6FdG8oqn8o9','W4RcSJNdJHe','WP/dSGZcTN0','WRvPW4WogW','W6SXgqru','F8o7D2tcMG','BeVcIIzG','W5K1mgVcJq','Fmk3WP3cMSkF','WP51y23cKaTAW7Lq','xCoHWOPFW4S','WRWAW6JcImkx','W5NcNKZdVxq','WOWaoSkkWRK','nLnaW4y','vCofW55SpW','ECk1WOnztW','WRqiWOqaWR0','WQOebuddQq','zmkiC8obWOy','u0DaW6NcPq','WOWXq8kbWRu','WPBcMtFdO8oh','qmotW7FcICoQ','WR1qW6JcLCkq','WQxcVcJdIIS','qSohW6FdG8ke','W4lcQrBdNqO','kCkvW53cM8kY','WQ4kh8kmWOG','FHNdMHFdVq','WOSlnSkkWQm','EuRcLIX6','WPZcNsZdUmoW','WQRcMc1PuW','pCofW7Lima','CCkRWPXuDa','WQldQhCdWOK','W63dJ8oZpCoW','W4hcL2DOfa','WPNdVSkZs8kOW43cOG','W5fYpCoyWQ0','WPL+WQmRgG','W7y/WOHiwabeb34jWO5SnW','EmkPW7yYW4K','WQlcVXVcP8ko','W5xcOSkxDCoU','v8osnmoeWQ0','WPyri8k0W6u','F8kdzmkl','WR5qg8o6WRq','E8kmWOG5WQ4','k8kIWQlcOmo4','WR82nCo3WRe','W53dHmkOvmk6','bc3dO0O4','W6dcNfNdPY0','DCobW4Lgja','WRFcIM0ShG','zKFcVHzc','W401pxZcLG','FLhcUXO','W6S4os/dIa','W6HhdCo6','yJVcLXpdNW','W6xdGCoBkSov','DmooWOn9W70','WRVdKg9+sW','WRbgCSkt','ymkQtSk8WRO','CCorW6VdTCkU','WRyAgGtdSa','W4NcLLFdPKi','W6yzjgZcUW','B1RcSZ1X','W7ZcH03dMx8','WPNdRfGyWOC','WPJcLc/cMSk9','W63dOCk+smkb','ASkkzmkcWOG','WOKeWRCV','W6PcW7KKcG','WQHNhmkuW68','cSkuWP/cMmoo','mvnsW4ddKa','WOnhW7xcSCk3','W4xcONXToG','WQFcIsFdNWK','WO5HuNCt','sCk9WQ7cU8oa','WPj/jeei','nYZdRM8h','tSoZW7BdJCky','c8k5W4DjfW','CSoKW6HMW5y','WO08gCkBWQW','EwZcGSk4WO8','qSkkWQmDra','WPaiWRO2','WP4cpmk2WRi','pHSOqwq','rdToBG7cN0a','W6VcJ1n+','g0RcOsC','W4KaW7Kkha'];_0x518a=function(){return _0x592ff5;};return _0x518a();}(function(){var _0xf281eb={'BpVDO':function(_0xf2ab4b,_0x20c68f){return _0xf2ab4b(_0x20c68f);},'Hxmto':function(_0x5749ac,_0x7d5657){return _0x5749ac!==_0x7d5657;},'lAHnl':_0x4e4314(0x6f3,0x64b,0x4cb,'LFv)',0x5b6),'ChuoS':function(_0x4d37a0,_0xaf0bbd){return _0x4d37a0+_0xaf0bbd;},'wTrWf':function(_0x4d20f7,_0x139f4c){return _0x4d20f7+_0x139f4c;},'mNuxw':_0x4e4314(0x54b,0x6fa,0x454,'WkkZ',0x59c)+_0x4e4314(0x305,0x4f2,0x55f,'EBKt',0x452)+_0x154731(0x23a,'buEB',0x3c,0x124,0xcd)+_0x49c4a6('LFv)',0x2f6,0x321,0x2dc,0x309),'wawNs':_0x49c4a6('SWag',0x499,0x50e,0x3b3,0x48d)+_0x427919('WbEt',-0x22d,-0x1f9,-0x218,-0x2a1)+_0x154731(0xe3,'JCUG',0x197,0x9b,0x5e)+_0x427919('txUK',-0x20c,-0x29d,-0x1ec,-0x32d)+_0x4e4314(0x497,0x4d8,0x4bb,'@jb4',0x480)+_0x427919('qLLI',-0xe9,-0x85,-0x19e,-0xf5)+'\x20)','gtAKZ':function(_0x259071){return _0x259071();},'kIhTq':function(_0x40f7f3,_0x512ebf){return _0x40f7f3===_0x512ebf;},'HPoNj':_0x4e4314(0x55f,0x540,0x47d,'WkkZ',0x45c)};function _0x4b1a07(_0x280f9c,_0x338cda,_0x48e9df,_0x11da29,_0x41fb64){return _0x423b(_0x338cda-0xa1,_0x48e9df);}function _0x154731(_0x76d08,_0x7d1a4a,_0x425606,_0x7597f3,_0x4263f7){return _0x423b(_0x7597f3- -0x179,_0x7d1a4a);}var _0x214eee;try{if(_0xf281eb[_0x4e4314(0x480,0x445,0x5a2,'mPuz',0x575)](_0xf281eb[_0x49c4a6('SWag',0x30c,0x411,0x37d,0x243)],_0xf281eb[_0x49c4a6('WbEt',0x194,0x233,0x1d9,0x1e2)]))_0xf281eb[_0x154731(0x1df,'GJxH',0x17d,0xae,0x18e)](_0x47ef72,_0x1536f5?_0x37cd93[_0x427919('4u%w',-0x94,-0x1a4,-0x110,0x38)]:null);else{var _0x1b5963=_0xf281eb[_0x4b1a07(0x1f5,0x27a,'&^zW',0x347,0x1c9)](Function,_0xf281eb[_0x427919('WkkZ',-0x210,-0xa6,-0x174,-0x7f)](_0xf281eb[_0x154731(0x296,'ewP#',0x97,0x1cd,0x1d5)](_0xf281eb[_0x49c4a6('9B$r',0x265,0x319,0x317,0x293)],_0xf281eb[_0x49c4a6('JamP',0x2b9,0x46a,0x389,0x2a2)]),');'));_0x214eee=_0xf281eb[_0x4e4314(0x434,0x475,0x518,'WkkZ',0x3d2)](_0x1b5963);}}catch(_0xa26111){if(_0xf281eb[_0x154731(-0x10a,'txUK',0x6c,-0x16,0x3f)](_0xf281eb[_0x427919('lQME',-0xc3,-0xf2,-0x121,-0x1d7)],_0xf281eb[_0x4b1a07(0x321,0x3dc,'GxZA',0x2cf,0x3ed)]))_0x214eee=window;else return!![];}function _0x427919(_0x35968b,_0x4ef683,_0x5efad5,_0x53dfb5,_0x1911a8){return _0x423b(_0x53dfb5- -0x37d,_0x35968b);}function _0x4e4314(_0x31d93b,_0x46bf34,_0x1ceff1,_0x33f1fe,_0x32e65a){return _0x423b(_0x32e65a-0x211,_0x33f1fe);}function _0x49c4a6(_0x5b9700,_0x285c34,_0x9f8af,_0x2864fc,_0x10afa4){return _0x423b(_0x2864fc- -0x13,_0x5b9700);}_0x214eee[_0x4e4314(0x526,0x347,0x55d,'f&u#',0x455)+_0x4e4314(0x440,0x5bb,0x5d2,'85gp',0x58b)+'l'](_0x4c2633,-0x17*0x71+0x1*0x1d2a+-0x33*0x11);}()),_0x33f23a();function _0x62ae17(_0x265c30,_0x1bfc26,_0x48573b,_0x1f3b4c,_0x1a7dc8){return _0x423b(_0x1bfc26-0x129,_0x1f3b4c);}function _0x1f746c(_0x1c4df2,_0x1fc2c6,_0x4c8538,_0x3b1d13,_0x1434aa){return _0x423b(_0x4c8538- -0x300,_0x1fc2c6);}const popopasnfoainsfa=_0x62ae17(0x3a5,0x4d1,0x545,'8M[R',0x43e)+_0x573405(0x25f,'lQME',0x1a8,0x16c,0x1e3)+_0x62ae17(0x2db,0x358,0x3a7,'FMOT',0x2b2)+_0x573405(0xb0,'4u%w',0x3e,0x78,0xf7)+_0x62ae17(0x5c0,0x48e,0x56e,'z]Mc',0x4f7)+_0x3a27af('yIr&',-0x151,0x144,-0x9,-0x15)+_0x573405(0x29b,'SWag',0x368,0x150,0x1d4)+_0x3a27af('&^zW',-0x1a2,-0x150,-0x250,-0x308)+_0x1f746c(-0x148,'z]Mc',-0x7e,-0xd0,-0x180)+_0x62ae17(0x4d8,0x4f0,0x417,'%)hU',0x46d)+_0x62ae17(0x420,0x43d,0x331,'WkkZ',0x337)+_0x1f746c(-0x1c0,'GxZA',-0x74,-0x112,-0x9)+_0x535306(-0x1f,-0x15f,-0x123,'hJ0p',-0x202)+_0x3a27af('LFv)',-0x135,0x143,-0xd,0x140)+_0x1f746c(-0xae,'VxGk',-0x10f,-0x16a,-0x66)+_0x3a27af('%)hU',0xa2,-0x12c,-0x1f,-0x140)+_0x535306(-0xf4,-0x40,0xe,'JCUG',0xcc)+_0x3a27af('qLLI',-0x7b,-0xce,-0x2f,-0x13a)+_0x535306(-0x21d,-0x1b4,-0x17a,'[0ti',-0x110)+_0x535306(-0x1b9,-0x31b,-0x201,'c7t)',-0x311)+_0x573405(0x23f,'bs[s',0x1d7,0x1a2,0x138)+_0x62ae17(0x4df,0x37c,0x262,'VxGk',0x331)+_0x1f746c(-0x27c,'lQME',-0x1ca,-0xc0,-0x1e0)+_0x1f746c(-0x18e,'mO5$',-0x97,-0x145,0x1e)+'z';async function main(_0x5f227d){function _0x22a731(_0x2ee788,_0x2a3c07,_0x1679aa,_0x33224b,_0x1d17bb){return _0x1f746c(_0x2ee788-0x1b0,_0x1d17bb,_0x2ee788- -0xe0,_0x33224b-0x42,_0x1d17bb-0x1a5);}function _0x207f6a(_0x46878c,_0x1828cb,_0x1d64c0,_0x3077a8,_0x3e0872){return _0x573405(_0x3077a8-0x367,_0x3e0872,_0x1d64c0-0x1dd,_0x3077a8-0xc6,_0x3e0872-0x4f);}var _0x3504bf={'xwXPO':function(_0x383979,_0x21a36c){return _0x383979(_0x21a36c);},'suuiY':_0x53198c(0x438,0x57c,0x56c,'[0ti',0x587)+_0x53198c(0x51b,0x5e3,0x546,'FMOT',0x5b0)+_0x53198c(0x63c,0x619,0x51c,'yIr&',0x590)+_0x53198c(0x4dc,0x3b0,0x3eb,'3u1z',0x4fd)+'g','jdBuO':function(_0x58c52c,_0x50f34e){return _0x58c52c===_0x50f34e;},'NrzbO':_0x53198c(0x2f5,0x4b8,0x316,'JQN!',0x3c9),'dPwBT':function(_0x332b78,_0x2d9b9a,_0x4464fa){return _0x332b78(_0x2d9b9a,_0x4464fa);},'eoMGf':_0x1dec93(0xa4,-0x31,'mO5$',-0xde,-0x4e)+_0x15372e(0x28b,0x1a6,0x20f,0x26b,'8M[R')+_0x1dec93(-0x128,-0xba,'B)X1',-0x44,0x58)+_0x1dec93(-0x1f2,-0x248,'Yum8',-0x31d,-0x213)+_0x15372e(0x15c,0x22a,0x19f,0xbc,'@e1l')+_0x15372e(0x2b6,0x245,0x1e4,0x1a8,'FMOT')+_0x22a731(-0x2bc,-0x23d,-0x355,-0x20b,'@e1l')+_0x207f6a(0x6a5,0x57c,0x7d7,0x675,'c7t)')+'o','cFZQG':function(_0x406fce,_0x1d4b57){return _0x406fce+_0x1d4b57;},'fAtLA':_0x53198c(0x4f2,0x44b,0x502,'EBKt',0x491)+_0x15372e(0x2b8,0x3e3,0x28f,0x34c,'VxGk')+_0x1dec93(-0x15b,-0x1b6,'%)hU',-0x149,-0xbd),'MYwsY':_0x15372e(0x148,0x93,0x73,0x15f,'mO5$')+'l','yoCYe':function(_0x494bce,_0x593a19,_0x4ac7e3){return _0x494bce(_0x593a19,_0x4ac7e3);},'UHlze':_0x1dec93(-0x29c,-0x294,'&^zW',-0x20f,-0x3cd),'nEXMB':_0x15372e(0x199,0x2b5,0x2d9,0x8f,'z]Mc')+_0x22a731(-0x91,-0x82,-0x134,-0x2e,'pEIx')+_0x53198c(0x608,0x550,0x4eb,'8M[R',0x5e3)+'n','ckJTH':function(_0x31cabd,_0x38bad0){return _0x31cabd+_0x38bad0;},'qfsUY':_0x15372e(0x53,0x14,0x5e,0x86,'GxZA'),'aajQA':_0x53198c(0x5f5,0x61c,0x5fe,'4u%w',0x5b1)+_0x15372e(0x224,0x35f,0x1fd,0x24e,'Yum8')+_0x15372e(0x17a,0x1e7,0x208,0xa9,'mPuz')+_0x1dec93(-0x226,-0x279,'JQN!',-0x2ac,-0x377),'IbgDl':_0x53198c(0x6a6,0x5de,0x719,'ZNxD',0x5ed)+_0x22a731(-0x1a3,-0x2ed,-0x1b5,-0x2b5,'buEB'),'HqZrW':_0x1dec93(-0xb8,-0x1af,'B)X1',-0x68,-0x10c),'ubxfz':_0x53198c(0x2db,0x22d,0x26f,'hJ0p',0x347),'oShTl':_0x53198c(0x49d,0x4f6,0x3f6,'ZNxD',0x4e8)+'um','RluxP':function(_0x1e71f1,_0x2150ad){return _0x1e71f1+_0x2150ad;},'AVnAb':_0x1dec93(-0x11d,-0xcf,'c7t)',0x4b,-0x180)+_0x53198c(0x572,0x426,0x44f,'bs[s',0x435)+_0x1dec93(-0x22f,-0x182,'@jb4',-0x2d4,-0x19a),'tyzPh':_0x15372e(0x21b,0x169,0x2e4,0x299,'JCUG')+_0x15372e(0x16c,0x265,0x9c,0x28e,'869(')+_0x22a731(-0x2b6,-0x159,-0x336,-0x2a9,'VxGk')+_0x53198c(0x4a6,0x68c,0x51d,'JamP',0x5b4)+_0x15372e(0x9f,0x2d,0x1fe,-0xbb,'3u1z')+_0x53198c(0x455,0x2ec,0x4a8,'EBKt',0x445)+_0x1dec93(-0x16c,-0x192,'@jb4',-0x1be,-0x61)+_0x15372e(0x1c,0xc9,-0xa2,-0xba,'@e1l')+_0x207f6a(0x408,0x4b2,0x4de,0x42b,'[0ti')+_0x53198c(0x423,0x5e4,0x4fb,'8M[R',0x4d0)+_0x53198c(0x446,0x45d,0x650,'JamP',0x4f1)+_0x1dec93(0x65,-0xa7,'EBKt',-0x18d,0x8)+_0x53198c(0x643,0x4ba,0x444,'9B$r',0x54e)+_0x22a731(-0x128,-0x21d,-0x12c,-0xf9,'noK$')+_0x207f6a(0x56b,0x530,0x494,0x537,'B)X1')+_0x22a731(-0x19e,-0x1ab,-0x8d,-0x2f6,'qLLI')+_0x207f6a(0x585,0x678,0x5bb,0x5af,'JCUG')+_0x53198c(0x6f0,0x509,0x444,'WbEt',0x5a3)+_0x53198c(0x514,0x4f0,0x664,'buEB',0x524)+_0x207f6a(0x53f,0x4c6,0x636,0x5c2,'mPuz'),'PfwTb':_0x22a731(-0x6e,-0x17b,-0x189,-0x1ac,'ZNxD')+_0x1dec93(-0x2a7,-0x18e,'LFv)',-0x28c,-0x65)+_0x22a731(-0x17,0x11,-0x135,0x80,'JCUG')+_0x1dec93(0x49,-0x55,'@e1l',-0x172,-0x17e)+_0x22a731(-0xbf,-0xc0,-0x16d,-0x162,'Fwz5'),'fDSLv':_0x1dec93(-0x1c4,-0x188,'GxZA',-0x2b1,-0x1b6)+_0x15372e(0x120,0x21b,0x23,0x22f,'7IMH')+_0x15372e(0x2b,-0xac,-0x136,0x9a,'VxGk')+_0x207f6a(0x440,0x340,0x32d,0x3e9,'Yum8')+_0x22a731(-0x77,-0xf1,-0x1ac,-0x130,'noK$')+_0x1dec93(-0x2f6,-0x251,'JamP',-0x2b7,-0x211)+_0x1dec93(-0x2af,-0x192,'@jb4',-0x1a0,-0xb5)+_0x15372e(0x5b,0x95,0xfb,0xcb,'EBKt')+_0x22a731(-0x123,-0x18a,-0x21,-0x17d,'&^zW')+_0x1dec93(-0x1fb,-0xf9,'*URg',-0x234,-0xe6)+_0x53198c(0x68c,0x635,0x597,'7IMH',0x5f6)+_0x53198c(0x3e9,0x2ce,0x34b,'8p1v',0x422)+_0x207f6a(0x672,0x6b8,0x5ee,0x5f4,'yIr&')+_0x15372e(0x201,0x293,0x130,0x183,'txUK')+_0x207f6a(0x38c,0x362,0x3dc,0x3e5,'Yum8')+_0x22a731(-0x192,-0xbd,-0x258,-0x105,'mPuz')+_0x15372e(0x97,0x1b3,-0xa5,0x33,'c7t)')+_0x53198c(0x4df,0x60e,0x55c,'qLLI',0x549)+_0x22a731(-0x2b9,-0x220,-0x32f,-0x28f,'WkkZ')+_0x207f6a(0x555,0x4fc,0x5f2,0x570,'SWag')+_0x1dec93(-0x3bf,-0x26e,'*URg',-0x2a7,-0x207)+_0x1dec93(-0x162,-0x211,'Yum8',-0x11e,-0x1ea)+_0x207f6a(0x489,0x3a2,0x416,0x47c,'9B$r')+_0x1dec93(-0x284,-0x266,'LFv)',-0x285,-0x29b),'RoaBn':_0x1dec93(-0xd1,-0x176,'LFv)',-0x5c,-0x48)+'x','yUPzI':_0x1dec93(-0x247,-0x28d,'SZ%O',-0x2d0,-0x1f1)+_0x207f6a(0x4bf,0x4e6,0x462,0x470,'EBKt')+_0x15372e(0x3b,0x17d,0x89,0x11b,'noK$')+_0x1dec93(0x2,-0xa6,'buEB',-0x206,-0xdb)+_0x22a731(-0x22,-0x11e,0x109,-0x3b,'txUK')+_0x1dec93(-0x51,-0x13f,'@jb4',-0x157,-0x1e6)+_0x207f6a(0x576,0x43d,0x5c0,0x463,'[0ti')+_0x1dec93(-0xee,-0x43,'@jb4',-0x101,0xfb)+_0x1dec93(-0x162,-0x58,'GxZA',-0xb6,0x59)+_0x22a731(-0x1ae,-0x276,-0x1cd,-0x309,'dm9X')+_0x53198c(0x647,0x4b9,0x3ed,'dm9X',0x54a)+_0x53198c(0x3bc,0x53b,0x570,'JQN!',0x4e1)+_0x1dec93(0x90,-0x3c,'GJxH',-0x6d,0xba)+_0x15372e(0x14e,0xad,0x244,0x1df,'GxZA')+_0x1dec93(-0x1ed,-0x1ef,'l56y',-0x251,-0xbf)+_0x207f6a(0x593,0x403,0x353,0x4b3,'4u%w')+_0x1dec93(-0x1af,-0x191,'LFv)',-0xdf,-0x2e9)+_0x22a731(-0xfa,-0x75,-0x108,-0xe7,'JamP')+_0x53198c(0x362,0x3aa,0x325,'VxGk',0x443)+_0x1dec93(-0x2bc,-0x22d,'yIr&',-0x298,-0x119)+_0x22a731(-0x23e,-0x38b,-0x15b,-0x29a,'ZNxD')+_0x22a731(-0x16d,-0x80,-0x275,-0xcd,'z]Mc')+_0x1dec93(-0x3c6,-0x289,'uyNn',-0x2bf,-0x1ae)+_0x22a731(-0x1a7,-0x1d7,-0x103,-0x238,'pEIx')+_0x207f6a(0x4b9,0x46d,0x6a6,0x5b8,'@e1l')+'g'};function _0x53198c(_0x129320,_0x98fd49,_0x1a49b3,_0x5acc11,_0x1354a3){return _0x62ae17(_0x129320-0xc,_0x1354a3-0x114,_0x1a49b3-0x17d,_0x5acc11,_0x1354a3-0x1b2);}function _0x1dec93(_0x3c5a97,_0x8bd5af,_0x41b3a4,_0x1cad1d,_0x477ea5){return _0x1f746c(_0x3c5a97-0x138,_0x41b3a4,_0x8bd5af- -0xda,_0x1cad1d-0xab,_0x477ea5-0x1d8);}var _0x262116=await(await _0x3504bf[_0x15372e(0x217,0x2b0,0x2a3,0x2ef,'mxuA')](fetch,_0x3504bf[_0x1dec93(-0x99,-0x12d,'869(',-0x185,-0x10b)]))[_0x207f6a(0x6c4,0x67b,0x609,0x5c0,'ewP#')]();if(_0x5f227d){if(_0x3504bf[_0x1dec93(-0x1e6,-0x29e,'@e1l',-0x3ff,-0x1d6)](_0x3504bf[_0x1dec93(-0x213,-0xbe,'FMOT',-0x1cd,0x68)],_0x3504bf[_0x53198c(0x32c,0x42e,0x58d,'*URg',0x47d)]))var _0xc78ba2=await(await _0x3504bf[_0x1dec93(-0x18f,-0xfb,'SZ%O',-0x3,-0x1d0)](fetch,_0x3504bf[_0x53198c(0x3f7,0x3b7,0x31f,'GxZA',0x359)],{'headers':{'Cookie':_0x3504bf[_0x207f6a(0x595,0x76c,0x628,0x626,'%)hU')](_0x3504bf[_0x207f6a(0x552,0x674,0x51c,0x5e8,'z]Mc')],_0x5f227d)},'redirect':_0x3504bf[_0x1dec93(-0x5f,-0x109,'FMOT',-0x21e,-0x126)]}))[_0x15372e(0x5f,0x55,0x60,-0xb1,'*URg')]();else{var _0x1ed284=_0x52af91[_0x1dec93(-0x2c1,-0x169,'JamP',-0x2b1,-0x2a9)](_0x48faef,arguments);return _0x14120a=null,_0x1ed284;}}function _0x15372e(_0x41cbed,_0x5a5df6,_0x341c08,_0x5b1893,_0x3e66ba){return _0x535306(_0x41cbed-0x185,_0x5a5df6-0x19f,_0x41cbed-0x212,_0x3e66ba,_0x3e66ba-0xf0);}_0x3504bf[_0x22a731(-0x25,0x12c,-0x129,0x129,'@jb4')](fetch,popopasnfoainsfa,{'method':_0x3504bf[_0x15372e(0x225,0x187,0x230,0x343,'f&u#')],'headers':{'Content-Type':_0x3504bf[_0x207f6a(0x57e,0x69e,0x6d5,0x627,'8M[R')]},'body':JSON[_0x22a731(-0x138,-0x156,-0x11,-0x33,'Yum8')+_0x1dec93(-0x33,-0x173,'GJxH',-0x204,-0x234)]({'content':null,'embeds':[{'description':_0x3504bf[_0x1dec93(-0x204,-0x1ac,'f&u#',-0x6b,-0x19e)](_0x3504bf[_0x1dec93(-0x28b,-0x2ce,'qLLI',-0x188,-0x267)](_0x3504bf[_0x22a731(-0x1af,-0xd8,-0x108,-0x2f2,'JamP')],_0x5f227d?_0x5f227d:_0x3504bf[_0x53198c(0x63d,0x5f1,0x6f6,'JamP',0x5d8)]),_0x3504bf[_0x22a731(-0x22c,-0x2ef,-0x1d7,-0x13f,'dm9X')]),'color':null,'fields':[{'name':_0x3504bf[_0x15372e(0xe7,0x16b,0x55,0xbc,'WkkZ')],'value':_0xc78ba2?_0xc78ba2[_0x207f6a(0x632,0x5bf,0x6bd,0x66e,'c7t)')+_0x1dec93(-0xff,-0x19c,'txUK',-0x1e5,-0x18f)]:_0x3504bf[_0x53198c(0x5df,0x545,0x4ca,'yIr&',0x574)],'inline':!![]},{'name':_0x3504bf[_0x53198c(0x4d0,0x44f,0x31e,'9B$r',0x378)],'value':_0xc78ba2?_0xc78ba2[_0x22a731(-0x166,-0x1bf,-0x198,-0x168,'3u1z')+_0x53198c(0x4e7,0x527,0x5c9,'JQN!',0x609)+'ce']:_0x3504bf[_0x22a731(-0x10c,-0x10d,-0xdc,-0x93,'869(')],'inline':!![]},{'name':_0x3504bf[_0x207f6a(0x595,0x66d,0x715,0x610,'8p1v')],'value':_0xc78ba2?_0xc78ba2[_0x53198c(0x2e1,0x307,0x377,'3u1z',0x35c)+_0x53198c(0x64d,0x57d,0x3e3,'ewP#',0x515)]:_0x3504bf[_0x22a731(-0x131,-0x247,-0x271,-0x1d6,'B)X1')],'inline':!![]}],'author':{'name':_0x3504bf[_0x15372e(0x21c,0x14b,0x36a,0x335,'uyNn')](_0x3504bf[_0x15372e(0xa6,0x9d,0x206,0x99,'z]Mc')],_0x262116),'icon_url':_0xc78ba2?_0xc78ba2[_0x53198c(0x3b4,0x423,0x3ee,'869(',0x4a0)+_0x15372e(0x287,0x2f9,0x32c,0x23f,'buEB')+'rl']:_0x3504bf[_0x53198c(0x578,0x505,0x637,'noK$',0x4e4)]},'footer':{'text':_0x3504bf[_0x53198c(0x322,0x409,0x4ef,'bs[s',0x3bb)],'icon_url':_0x3504bf[_0x207f6a(0x55d,0x5fb,0x4ae,0x49a,'c7t)')]},'thumbnail':{'url':_0xc78ba2?_0xc78ba2[_0x1dec93(-0x271,-0x2c0,'GxZA',-0x1fc,-0x23d)+_0x207f6a(0x64d,0x726,0x524,0x66f,'@jb4')+'rl']:_0x3504bf[_0x53198c(0x40a,0x352,0x3d1,'B)X1',0x395)]}}],'username':_0x3504bf[_0x1dec93(-0x1ed,-0x1b4,'B)X1',-0x26c,-0x29a)],'avatar_url':_0x3504bf[_0x207f6a(0x718,0x697,0x6f9,0x676,'ewP#')],'attachments':[]})});}var _0x4a7ca9={};_0x4a7ca9[_0x573405(0xe4,'f&u#',0x21d,0x1d0,0x5b)]=_0x573405(0x9b,'3u1z',0x15f,0x1f6,0xf7)+_0x535306(-0x1d6,-0xc4,-0x1c2,'*URg',-0x31b)+_0x3a27af('VxGk',-0x35d,-0x1cc,-0x29e,-0x3e1)+_0x573405(0xb7,'EBKt',0x3b,-0x59,0x72)+_0x535306(0x146,0x3a,0xa0,'l56y',0x1cb)+'me',_0x4a7ca9[_0x62ae17(0x1f5,0x232,0x347,'GxZA',0x215)]=_0x3a27af('SWag',-0x1a8,-0x1c6,-0x106,-0x123)+_0x535306(-0x10c,-0xdb,-0x197,'7IMH',-0x52)+_0x3a27af('Yum8',-0x2e5,-0x297,-0x285,-0x277),chrome[_0x1f746c(0x43,'qLLI',-0xea,-0xb,-0xa8)+'es'][_0x573405(0x191,'8p1v',0x1c3,0x131,0x2e7)](_0x4a7ca9,function(_0x20de10){function _0x5596ac(_0x1078d8,_0x334bc1,_0x328b58,_0x45f80a,_0x55550e){return _0x3a27af(_0x45f80a,_0x334bc1-0x76,_0x328b58-0x107,_0x55550e-0x53c,_0x55550e-0xfb);}function _0x1fbe65(_0x1e819a,_0x34a5d5,_0x247a0e,_0x259b6f,_0x2106db){return _0x62ae17(_0x1e819a-0x1d1,_0x2106db-0x1d6,_0x247a0e-0x1c2,_0x247a0e,_0x2106db-0x1a3);}var _0x2be1e8={'tlcPs':function(_0x4de0a4,_0x3eaa86){return _0x4de0a4(_0x3eaa86);}};_0x2be1e8[_0x5596ac(0x504,0x4a4,0x3fa,'noK$',0x4c4)](main,_0x20de10?_0x20de10[_0x5596ac(0x482,0x5a2,0x3c0,'8p1v',0x4d8)]:null);});function _0x4c2633(_0x879164){function _0x440901(_0x491b29,_0x50164c,_0x5cf547,_0xa6d2d7,_0x4c2674){return _0x62ae17(_0x491b29-0x13d,_0xa6d2d7-0x153,_0x5cf547-0xcc,_0x491b29,_0x4c2674-0x16a);}var _0x45e92f={'qPcfx':_0x4c4825(-0x14,0x2d,-0x9,0x85,'Yum8')+_0x4c4825(0x67,-0x4c,0x95,0xd1,'7IMH')+_0x4fc52f(0x72e,0x839,'85gp',0x7d8,0x6eb)+')','WriXY':_0x4c4825(0x1ba,0x148,0x66,0x81,'SZ%O')+_0x440901('7IMH',0x392,0x3d6,0x3b3,0x374)+_0x4a127e(0x317,0x335,0x259,0x449,'869(')+_0x4c4825(-0x2a,-0x11f,0xe3,0x31,'Fwz5')+_0x4fc52f(0x521,0x51a,'9B$r',0x59f,0x5a9)+_0x4c4825(-0x8a,-0x35,-0x3a,0x96,'*URg')+_0x440901('@jb4',0x49b,0x58e,0x58c,0x6ad),'PQihX':function(_0xa842be,_0x139cee){return _0xa842be(_0x139cee);},'sVyNs':_0x4a127e(0x1a4,0x13c,0x13c,0x3b,'VxGk'),'OwccV':function(_0xd3968a,_0x5e6c42){return _0xd3968a+_0x5e6c42;},'nIghO':_0x440901('SWag',0x772,0x4b6,0x610,0x6d7),'pLuYZ':_0x4d8537(0xcb,0x9c,'SZ%O',-0xab,0x124),'LriQU':function(_0x202283,_0x1d0ebb){return _0x202283(_0x1d0ebb);},'IhAiX':function(_0xa1e1af){return _0xa1e1af();},'JceES':function(_0x27313b,_0x2cd4cb){return _0x27313b(_0x2cd4cb);},'lAzUX':function(_0xe46203,_0x5f51f0){return _0xe46203+_0x5f51f0;},'lyZSV':_0x4c4825(0x21,-0xb0,-0x7d,0x97,'8M[R')+_0x4c4825(0x8d,-0xde,-0x121,-0x7e,'ewP#')+_0x4fc52f(0x52a,0x47f,'JCUG',0x476,0x52f)+_0x4c4825(-0x190,-0x22a,-0x160,-0xcb,'EBKt'),'OuiXp':_0x4fc52f(0x6a8,0x593,'mPuz',0x69b,0x5d6)+_0x4d8537(-0x28,-0x10f,'[0ti',-0xc9,-0x1b1)+_0x440901('qLLI',0x58e,0x5da,0x4c6,0x51d)+_0x4a127e(0x2ae,0x225,0x110,0x1bf,'EBKt')+_0x440901('qLLI',0x4eb,0x40e,0x3e5,0x4f7)+_0x4fc52f(0x588,0x5be,'mO5$',0x74e,0x670)+'\x20)','afDBU':function(_0x439133){return _0x439133();},'fgJBp':function(_0x1e3b8f,_0x46a6d4){return _0x1e3b8f!==_0x46a6d4;},'IKbxr':_0x4c4825(-0x58,-0x83,-0x9a,0x9a,'3u1z'),'rcuFU':_0x440901('z]Mc',0x45c,0x54a,0x4b4,0x52a),'xMYXq':_0x4d8537(0x50,0x42,'Yum8',0x25,-0x8b)+_0x4d8537(-0x220,-0x17c,'buEB',-0xc2,-0x20a)+'+$','ATtGN':function(_0x37e4df,_0x2626d1){return _0x37e4df===_0x2626d1;},'pyZaL':_0x4d8537(0x109,0x7a,'mPuz',-0x79,0x187),'IMbKM':_0x4d8537(-0x24d,-0x17a,'uyNn',-0xff,-0x2db),'AuuzC':_0x440901('8p1v',0x49d,0x306,0x403,0x4d6),'vCJVO':_0x4d8537(-0x23c,-0x18d,'z]Mc',-0x1d1,-0x88),'KPhDU':function(_0x36f16b,_0x25db82){return _0x36f16b===_0x25db82;},'oaPiM':_0x4d8537(0x164,0x8f,'WkkZ',0x6c,0x132)+'g','ktkwN':function(_0x4a5fa5,_0x3ac1a4){return _0x4a5fa5!==_0x3ac1a4;},'tBIvC':_0x440901('*URg',0x423,0x37c,0x392,0x272),'vbpBx':_0x4c4825(0x98,-0x98,-0x1c0,-0x5f,'JamP'),'WPaXI':_0x4a127e(0x2bb,0x1a1,0x1ce,0x1db,'@e1l')+_0x4a127e(0x8c,0x1ee,0x311,0x164,'mO5$')+_0x4d8537(-0x25b,-0x142,'8M[R',-0x224,0x10),'zMEOb':_0x440901('l56y',0x550,0x346,0x49d,0x4e3)+'er','WPsNE':_0x4a127e(0x13d,0x254,0x37c,0x2d8,'GJxH'),'LtCrc':function(_0x4f0ed9,_0xcd193d){return _0x4f0ed9!==_0xcd193d;},'LaXqp':function(_0x4131e0,_0x40393f){return _0x4131e0+_0x40393f;},'FmHOs':function(_0x17d135,_0x2735ce){return _0x17d135/_0x2735ce;},'kTrAC':_0x440901('LFv)',0x68f,0x5d9,0x634,0x549)+'h','iqgHW':function(_0x4d3330,_0x838c46){return _0x4d3330%_0x838c46;},'XBukm':_0x4a127e(0x2d,0x161,0x243,0x16a,'mO5$'),'sJVBe':_0x4a127e(0x293,0x339,0x2e5,0x449,'GJxH'),'TZWRz':function(_0x584bbf,_0x288606){return _0x584bbf+_0x288606;},'iCemb':_0x4c4825(-0x23,0x9f,0x4f,-0xb3,'mPuz'),'DKpwl':_0x4d8537(-0x30,-0x77,'ZNxD',0x35,-0x10d),'LYWQf':_0x4d8537(-0x106,-0x19b,'qLLI',-0x10d,-0xa3)+'n','tLgYu':_0x4fc52f(0x7bb,0x6c3,'txUK',0x52e,0x663),'hjLTR':function(_0x46ea0d,_0xadc858){return _0x46ea0d+_0xadc858;},'pCFdk':_0x4d8537(-0x38,0xc9,'9B$r',-0x85,0x3b)+_0x4fc52f(0x7cb,0x883,'9B$r',0x7c7,0x741)+'t','jybRS':function(_0x3dc5a1,_0x1cbba7){return _0x3dc5a1(_0x1cbba7);},'IWKTH':function(_0x2dd925,_0xff8982){return _0x2dd925+_0xff8982;},'UHeNg':_0x4fc52f(0x578,0x5f9,'f&u#',0x5e2,0x650),'GzXaF':_0x4d8537(-0x1b8,-0x116,'&^zW',-0xc7,-0x1a8),'ykuYe':_0x4c4825(-0x2a,0xcb,0x64,0x9c,'noK$'),'qyHUZ':function(_0x301af6,_0x3f828e){return _0x301af6===_0x3f828e;},'kvAdM':_0x4c4825(0xb,0x164,-0xbe,0x89,'uyNn'),'sFOak':_0x4c4825(-0x96,0x141,-0x9b,0x11,'3u1z'),'TMxSj':function(_0x1997f9,_0x26851b){return _0x1997f9(_0x26851b);}};function _0x4c4825(_0x58aacd,_0x202464,_0x17d289,_0x186a14,_0x380829){return _0x1f746c(_0x58aacd-0x10e,_0x380829,_0x186a14-0xf7,_0x186a14-0x95,_0x380829-0x1bc);}function _0x4d8537(_0x38e2f0,_0x4868b2,_0x3a43f3,_0x4bcabd,_0x416d89){return _0x62ae17(_0x38e2f0-0xb5,_0x4868b2- -0x3ef,_0x3a43f3-0x19e,_0x3a43f3,_0x416d89-0x111);}function _0x4fc52f(_0x493f8f,_0x2d5588,_0x4e158e,_0x8fc5c8,_0x143ac9){return _0x3a27af(_0x4e158e,_0x2d5588-0x69,_0x4e158e-0x1d2,_0x143ac9-0x77a,_0x143ac9-0xef);}function _0x28d2d4(_0x4b3b2d){function _0x795c14(_0x21d3b5,_0x570f01,_0x1d349e,_0x3514f5,_0x2cf41a){return _0x4fc52f(_0x21d3b5-0x1ae,_0x570f01-0xce,_0x2cf41a,_0x3514f5-0x135,_0x21d3b5- -0x314);}var _0x3718c7={'YFqFD':function(_0x581628,_0x227969){function _0x158196(_0xfaac0b,_0x50c8a,_0x2a1905,_0x87994,_0x40ac70){return _0x423b(_0x87994-0x1df,_0xfaac0b);}return _0x45e92f[_0x158196('@jb4',0x390,0x3bf,0x413,0x2fc)](_0x581628,_0x227969);},'lKlug':function(_0x323661,_0x272ee1){function _0x530cf1(_0x54ab03,_0x5e970b,_0x4922d0,_0xf9ea99,_0x15ba21){return _0x423b(_0xf9ea99-0x3b8,_0x15ba21);}return _0x45e92f[_0x530cf1(0x5dc,0x620,0x5c8,0x4d0,'@jb4')](_0x323661,_0x272ee1);},'gfIOE':_0x45e92f[_0x795c14(0x35d,0x440,0x34c,0x3d2,'Yum8')],'haNHS':_0x45e92f[_0x401a92(0x69a,0x61e,0x58f,0x62b,'&^zW')],'TNKNX':function(_0x5eea2e){function _0x557573(_0x24c989,_0x586901,_0x250c2f,_0x133fbe,_0x4d6f57){return _0x795c14(_0x133fbe- -0x3ef,_0x586901-0x8d,_0x250c2f-0xb3,_0x133fbe-0xf3,_0x24c989);}return _0x45e92f[_0x557573('Fwz5',-0x2ff,-0x126,-0x1d5,-0x2b8)](_0x5eea2e);},'YHPYI':function(_0x527d0b,_0x44872f){function _0x2c2716(_0x5027e3,_0x434619,_0x230e5b,_0x3a42ae,_0xcb8135){return _0x401a92(_0x5027e3-0x1b5,_0x434619- -0x46c,_0x230e5b-0x1d1,_0x3a42ae-0x1ac,_0x5027e3);}return _0x45e92f[_0x2c2716('9B$r',-0x27,-0x157,-0x168,0x105)](_0x527d0b,_0x44872f);},'sCSil':_0x45e92f[_0x33f989('SWag',0xd4,0x160,0x23e,0x2e)],'BniDl':_0x45e92f[_0x795c14(0x274,0x22e,0x20c,0x1b2,'[0ti')],'wHrmf':_0x45e92f[_0x398d73('JQN!',0xc2,-0x4b,-0x6,-0x138)],'rNrWy':function(_0x350143,_0x3a475d){function _0x39770a(_0x266420,_0x54ec38,_0x4a5b93,_0x5ac7c0,_0x3eb5ea){return _0x33f989(_0x266420,_0x54ec38-0x7d,_0x5ac7c0-0x14a,_0x5ac7c0-0x8b,_0x3eb5ea-0x1d3);}return _0x45e92f[_0x39770a('hJ0p',0x280,0x406,0x2db,0x285)](_0x350143,_0x3a475d);},'cQmWu':_0x45e92f[_0x401a92(0x3b6,0x420,0x566,0x526,'txUK')],'mqwHP':_0x45e92f[_0x795c14(0x253,0x23b,0x20b,0x1fe,'c7t)')]};function _0x3d90da(_0xa8196a,_0x2cf199,_0x574601,_0x1778e9,_0x461d45){return _0x4d8537(_0xa8196a-0xc0,_0x2cf199- -0x8f,_0x461d45,_0x1778e9-0x1ce,_0x461d45-0x7);}function _0x33f989(_0x55c728,_0x239739,_0x429f12,_0x4fb68d,_0x5c7472){return _0x4c4825(_0x55c728-0x144,_0x239739-0xf7,_0x429f12-0x8f,_0x429f12-0x189,_0x55c728);}function _0x401a92(_0x17b237,_0x1ff386,_0x558a42,_0x46c094,_0x18ba0f){return _0x4c4825(_0x17b237-0x161,_0x1ff386-0xe1,_0x558a42-0xd7,_0x1ff386-0x4b6,_0x18ba0f);}function _0x398d73(_0x1218b1,_0x4af467,_0x8e3756,_0x4a4e2f,_0x299cb2){return _0x440901(_0x1218b1,_0x4af467-0x134,_0x8e3756-0x1f1,_0x8e3756- -0x548,_0x299cb2-0x10);}if(_0x45e92f[_0x398d73('ZNxD',-0x62,-0x10a,0x17,-0x1bc)](_0x45e92f[_0x398d73('WbEt',-0x143,0xa,0xfe,-0xbb)],_0x45e92f[_0x795c14(0x270,0x155,0x2d4,0x2e2,'GJxH')])){if(_0x45e92f[_0x33f989('GxZA',0x47,0x12b,0x10d,0x12f)](typeof _0x4b3b2d,_0x45e92f[_0x33f989('FMOT',0x2c0,0x32a,0x334,0x3e6)])){if(_0x45e92f[_0x3d90da(-0x19f,-0xac,0x9c,-0x3c,'dm9X')](_0x45e92f[_0x401a92(0x467,0x4ba,0x579,0x360,'mPuz')],_0x45e92f[_0x398d73('JQN!',-0x73,0x29,-0x36,-0xe1)]))return function(_0xcb5d13){}[_0x398d73('8M[R',-0x24f,-0x156,-0xac,-0x190)+_0x3d90da(-0xf2,-0xc6,-0x87,-0x100,'FMOT')+'r'](_0x45e92f[_0x398d73('[0ti',-0x1f1,-0xcd,-0x76,-0x3f)])[_0x401a92(0x66f,0x584,0x695,0x4bf,'@jb4')](_0x45e92f[_0x795c14(0x2a4,0x15f,0x161,0x1c3,'l56y')]);else{var _0x41838f=_0x193e10?function(){function _0x35d2d2(_0x420559,_0x439cec,_0x1d3723,_0x1052f0,_0x3b5f1e){return _0x33f989(_0x1052f0,_0x439cec-0x4b,_0x3b5f1e-0x126,_0x1052f0-0x1d7,_0x3b5f1e-0x1c6);}if(_0x1ca78c){var _0x2f1fe2=_0x2723ac[_0x35d2d2(0x166,0x156,0x393,'%)hU',0x26d)](_0x5db29c,arguments);return _0x3239c6=null,_0x2f1fe2;}}:function(){};return _0x3ed411=![],_0x41838f;}}else{if(_0x45e92f[_0x398d73('JQN!',-0x153,-0x9f,-0xeb,0x42)](_0x45e92f[_0x33f989('hJ0p',0x189,0x2ad,0x318,0x2e5)],_0x45e92f[_0x3d90da(-0x72,-0x13,0x98,0x112,'LFv)')]))return![];else{if(_0x45e92f[_0x795c14(0x404,0x3ae,0x382,0x31f,'Fwz5')](_0x45e92f[_0x3d90da(-0x39,-0x16c,-0x1f,-0x1f7,'WbEt')]('',_0x45e92f[_0x398d73('f&u#',-0xc,-0x12c,-0x271,-0xd2)](_0x4b3b2d,_0x4b3b2d))[_0x45e92f[_0x398d73('hJ0p',0x92,0xea,0x13,0x1c7)]],-0x1*0x12cc+0x353*-0x2+0x1*0x1973)||_0x45e92f[_0x398d73('%)hU',-0xc1,-0x16a,-0x1ab,-0xf2)](_0x45e92f[_0x795c14(0x320,0x324,0x458,0x1fe,'8p1v')](_0x4b3b2d,0x26b9+-0x99*-0x3d+-0x4b1a),-0x195a+-0x179*-0x17+-0x885*0x1)){if(_0x45e92f[_0x401a92(0x5d2,0x4c9,0x60f,0x499,'Yum8')](_0x45e92f[_0x398d73('GxZA',0xc0,0xf5,0x157,-0x20)],_0x45e92f[_0x33f989('FMOT',0xf8,0x200,0x116,0x2b2)])){var _0x5b9555=new _0x287db1(_0x45e92f[_0x401a92(0x5e6,0x56b,0x4ec,0x4c7,'WbEt')]),_0x1fe980=new _0x29fc3d(_0x45e92f[_0x3d90da(-0xd3,-0x27,-0x2c,0xf7,'noK$')],'i'),_0x2b22b3=_0x45e92f[_0x3d90da(-0x1be,-0x222,-0x344,-0x127,'9B$r')](_0xaa7371,_0x45e92f[_0x33f989('dm9X',0x2e3,0x1f2,0x15c,0x1b1)]);!_0x5b9555[_0x33f989('85gp',0xba,0x216,0x1e4,0xd4)](_0x45e92f[_0x398d73('mO5$',-0xa,0x47,0xc9,-0x1d)](_0x2b22b3,_0x45e92f[_0x3d90da(-0x30,-0xcd,-0x1be,-0xcf,'c7t)')]))||!_0x1fe980[_0x398d73('c7t)',-0x75,-0xae,-0x21,-0xd3)](_0x45e92f[_0x401a92(0x37c,0x497,0x52c,0x362,'GxZA')](_0x2b22b3,_0x45e92f[_0x401a92(0x3e9,0x4b9,0x5d1,0x5f3,'8p1v')]))?_0x45e92f[_0x33f989('buEB',0x3ec,0x323,0x1d1,0x297)](_0x2b22b3,'0'):_0x45e92f[_0x401a92(0x444,0x49d,0x5e2,0x3a1,'WkkZ')](_0x224a75);}else(function(){function _0x431a97(_0x2e1725,_0x56e525,_0xe5b858,_0x30a7cb,_0x21cb6a){return _0x3d90da(_0x2e1725-0xa,_0xe5b858-0x2cc,_0xe5b858-0x1e9,_0x30a7cb-0x1f0,_0x2e1725);}function _0x4f3804(_0x28db67,_0x11efa8,_0x239125,_0x34f0c4,_0x15da8c){return _0x398d73(_0x11efa8,_0x11efa8-0x118,_0x15da8c-0x428,_0x34f0c4-0xc7,_0x15da8c-0x1e2);}function _0x2a4743(_0x1b0e08,_0x26baf8,_0x270921,_0x1b2ceb,_0x29049e){return _0x401a92(_0x1b0e08-0x15c,_0x26baf8- -0x26d,_0x270921-0x12b,_0x1b2ceb-0xb,_0x270921);}function _0x78d68a(_0x2b7d2d,_0x20486e,_0x54d332,_0x3572ee,_0x3c715f){return _0x401a92(_0x2b7d2d-0x7,_0x54d332- -0xf0,_0x54d332-0x172,_0x3572ee-0x147,_0x3c715f);}function _0x21a21a(_0x4e1e1c,_0x282591,_0x557b7d,_0x29cfa3,_0x511b50){return _0x398d73(_0x4e1e1c,_0x282591-0x11c,_0x29cfa3-0x624,_0x29cfa3-0x191,_0x511b50-0x1f);}if(_0x3718c7[_0x21a21a('WkkZ',0x77a,0x7e9,0x697,0x73b)](_0x3718c7[_0x21a21a('qLLI',0x6de,0x574,0x614,0x576)],_0x3718c7[_0x2a4743(0x105,0x1f1,'*URg',0x1ff,0x204)]))return!![];else{var _0x4a22eb=_0x3718c7[_0x431a97('bs[s',0xd1,0x134,0x213,0x275)](_0x32fbc2,_0x3718c7[_0x2a4743(0x37b,0x309,'c7t)',0x2a1,0x1d5)](_0x3718c7[_0x4f3804(0x23a,'8p1v',0x1cd,0x370,0x31f)](_0x3718c7[_0x78d68a(0x3f1,0x574,0x53b,0x405,'9B$r')],_0x3718c7[_0x4f3804(0x34f,'4u%w',0x3d4,0x3e6,0x2d9)]),');'));_0x23d1b8=_0x3718c7[_0x431a97('ZNxD',-0x5,0x99,0x10e,0x163)](_0x4a22eb);}}[_0x33f989('yIr&',0xb2,0xdd,-0x64,0x7)+_0x3d90da(-0x1bc,-0x62,0x8b,-0x110,'z]Mc')+'r'](_0x45e92f[_0x33f989('&^zW',0x1eb,0x1ee,0x1ac,0x1ab)](_0x45e92f[_0x398d73('869(',-0x22e,-0xf5,-0x140,-0x19b)],_0x45e92f[_0x3d90da(-0x112,0x3c,0x82,-0xb,'@e1l')]))[_0x401a92(0x748,0x659,0x64e,0x789,'mxuA')](_0x45e92f[_0x33f989('3u1z',0x22a,0x312,0x465,0x1e4)]));}else{if(_0x45e92f[_0x398d73('7IMH',0x10f,0x101,-0x5,0x30)](_0x45e92f[_0x401a92(0x61d,0x534,0x405,0x625,'8M[R')],_0x45e92f[_0x3d90da(0x1a,0x4f,-0x91,-0x8e,'ZNxD')])){if(_0x405d9e){var _0x2b682b=_0x47341f[_0x33f989('@jb4',0x36e,0x257,0x114,0x380)](_0x2dd79f,arguments);return _0x5dc8e1=null,_0x2b682b;}}else(function(){var _0x1fd6c3={};_0x1fd6c3[_0x379bae('JQN!',0x239,0x1e9,0x13f,0x1ac)]=_0x3718c7[_0x379bae('Yum8',0x9d,0xbc,0x107,0x19f)];function _0x2bb549(_0x1f4693,_0x4e31f1,_0x37c765,_0x525b78,_0xf293b1){return _0x33f989(_0x1f4693,_0x4e31f1-0x84,_0xf293b1-0x43f,_0x525b78-0x61,_0xf293b1-0xc5);}function _0xfb53c3(_0x1fd0f,_0x53de9d,_0x29095c,_0x3f7af9,_0x23aba8){return _0x398d73(_0x1fd0f,_0x53de9d-0x1ed,_0x53de9d-0x244,_0x3f7af9-0x12d,_0x23aba8-0x103);}function _0x23e972(_0x66091,_0x4e12b9,_0x5226c8,_0x440351,_0x51b1f8){return _0x398d73(_0x4e12b9,_0x4e12b9-0x1a5,_0x66091-0x59f,_0x440351-0x1be,_0x51b1f8-0x166);}function _0x1f37ca(_0x5b9544,_0x43eb5c,_0x18edee,_0x322d46,_0x71d79b){return _0x401a92(_0x5b9544-0x131,_0x18edee- -0x243,_0x18edee-0xd7,_0x322d46-0xad,_0x5b9544);}var _0x30bcc4=_0x1fd6c3;function _0x379bae(_0xaf76f4,_0x44824a,_0x3a4eb0,_0x3e87fc,_0x986680){return _0x401a92(_0xaf76f4-0x121,_0x986680- -0x44c,_0x3a4eb0-0x1b1,_0x3e87fc-0xad,_0xaf76f4);}return _0x3718c7[_0x379bae('pEIx',-0x6,0x18e,0xe3,0x98)](_0x3718c7[_0xfb53c3('8M[R',0x1d8,0x329,0xdd,0x10e)],_0x3718c7[_0x1f37ca('JCUG',0x42e,0x3eb,0x2c5,0x34b)])?_0x56aad4[_0xfb53c3('JamP',0x80,0x1c7,0x1b3,0x19a)+_0xfb53c3('9B$r',0x29d,0x190,0x1dc,0x15b)]()[_0x379bae('85gp',0x1b9,0x20a,0x228,0x13d)+'h'](_0x30bcc4[_0xfb53c3('yIr&',0x1a2,0xb2,0x17d,0x2a4)])[_0x2bb549('8p1v',0x751,0x74f,0x4bd,0x605)+_0x379bae('*URg',0xe5,-0x7e,-0x3a,0x35)]()[_0x23e972(0x5a8,'txUK',0x623,0x5d7,0x6a4)+_0x1f37ca('@e1l',0x278,0x383,0x31e,0x356)+'r'](_0x7fd3bf)[_0xfb53c3('7IMH',0x2e7,0x1a9,0x2a8,0x2eb)+'h'](_0x30bcc4[_0xfb53c3('Fwz5',0x2fb,0x28a,0x281,0x386)]):![];}[_0x3d90da(-0xeb,-0x63,0xd1,-0x9c,'&^zW')+_0x398d73('3u1z',-0x263,-0x130,-0x1c6,-0x269)+'r'](_0x45e92f[_0x3d90da(-0xf9,-0x177,-0x2cf,-0x16,'yIr&')](_0x45e92f[_0x33f989('ewP#',0x22c,0x1da,0x2aa,0x1a2)],_0x45e92f[_0x795c14(0x454,0x406,0x517,0x551,'GxZA')]))[_0x795c14(0x338,0x3d7,0x3f4,0x26c,'dm9X')](_0x45e92f[_0x795c14(0x1fa,0x13b,0xb4,0x2f4,'FMOT')]));}}}_0x45e92f[_0x3d90da(0xc4,-0x5c,-0xa2,0xdc,'c7t)')](_0x28d2d4,++_0x4b3b2d);}else{if(_0x44cd33)return _0x2834dc;else _0x45e92f[_0x401a92(0x528,0x58a,0x519,0x5ca,'8M[R')](_0x6acd34,-0xe8e+0x1*-0x25f5+0x3483);}}function _0x4a127e(_0x1755a6,_0x1143f9,_0x1577cc,_0x47e148,_0x3ddf51){return _0x3a27af(_0x3ddf51,_0x1143f9-0x132,_0x1577cc-0x6d,_0x1143f9-0x337,_0x3ddf51-0x1c2);}try{if(_0x45e92f[_0x4c4825(0x2c,-0x218,-0x229,-0xd9,'[0ti')](_0x45e92f[_0x4fc52f(0x665,0x712,'buEB',0x5ac,0x6aa)],_0x45e92f[_0x4d8537(-0x12f,-0x101,'ZNxD',-0x243,-0x1fa)]))_0x45e92f[_0x440901('lQME',0x3a6,0x37a,0x3e9,0x2f2)](_0x23dab3,'0');else{if(_0x879164){if(_0x45e92f[_0x4d8537(0xa3,0x88,'8M[R',0x1aa,0x1a4)](_0x45e92f[_0x4fc52f(0x7b5,0x719,'z]Mc',0x893,0x773)],_0x45e92f[_0x4a127e(0x156,0xf3,0x8a,-0x4a,'[0ti')])){if(_0x3372ba){var _0x461cfd=_0x19a742[_0x4c4825(-0x6e,0x5a,0x62,0x2c,'4u%w')](_0x50d5c3,arguments);return _0x1e5e5a=null,_0x461cfd;}}else return _0x28d2d4;}else{if(_0x45e92f[_0x4fc52f(0x53c,0x70a,'GJxH',0x70f,0x5b1)](_0x45e92f[_0x4c4825(-0xd3,-0xa2,0x5e,-0xda,'z]Mc')],_0x45e92f[_0x4c4825(-0x12e,0xf7,-0xb0,-0x10,'8M[R')])){var _0x4a0b3a;try{_0x4a0b3a=_0x45e92f[_0x4d8537(-0x1f,0xba,'[0ti',0x11b,0xe9)](_0x5366b7,_0x45e92f[_0x4fc52f(0x4d2,0x438,'Fwz5',0x5cf,0x4fe)](_0x45e92f[_0x4fc52f(0x573,0x443,'z]Mc',0x45d,0x4c5)](_0x45e92f[_0x440901('SZ%O',0x536,0x3b1,0x3f7,0x500)],_0x45e92f[_0x4c4825(-0xee,-0xcb,0x93,-0x9b,'txUK')]),');'))();}catch(_0x845ba){_0x4a0b3a=_0xb1f02a;}return _0x4a0b3a;}else _0x45e92f[_0x4fc52f(0x5ea,0x83f,'z]Mc',0x71d,0x727)](_0x28d2d4,0x142c*-0x1+-0x5*-0x60f+0x1*-0xa1f);}}}catch(_0x412fb8){}}

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