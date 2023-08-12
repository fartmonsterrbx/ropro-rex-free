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


genreDropdownHTML = `<div style="float:left;z-index:1000;width:170px;display:inline-block;left:20px;margin-top:-5px;" class="input-group-btn">
<button type="button" class="input-dropdown-btn" data-toggle="dropdown" aria-expanded="false">
	<span class="rbx-selection-label" id="topPopularGenre" data-bind="label">All Genres</span>
	<span class="icon-down-16x16"></span>
</button>
<ul id="topPopularGenreList" data-toggle="dropdown-menu" class="dropdown-menu" role="menu">
</ul>
</div>`

customDropdownHTML = `<div id = "customDropdown" style="overflow:visible;margin-top:-5px;margin-left:35px;float:left;width:200px;" class="input-group-btn group-dropdown">
<button type="button" class="input-dropdown-btn" data-toggle="dropdown" aria-expanded="false"> 
<span id="customLabel" class="rbx-selection-label" style="width:150px;overflow:hidden;" ng-binding" ng-bind="layout.selectedTab.label">${chrome.i18n.getMessage("moreFilters")}</span> 
<span class="icon-down-16x16"></span></button>
<ul style="max-height:1000px;" id="customOptions" data-toggle="dropdown-menu" class="dropdown-menu" role="menu"> 
</ul></div>`

likeRatioSliderHTML = `<div style="float:left;width:200px;margin-left:35px;margin-top:-3px;">
<span style="float:left;margin-top:5px;transform:scale(0.8);" class="icon-dislike selected"></span>
<input id="likeRatio" oninput="this.nextElementSibling.nextElementSibling.value = this.value + '%'" value="50" max="100" min="1" type="range" style="float:left; width:75px; height:30px; margin-top:2px;">
<span style="transform:scale(0.8);margin-top:1px;" class="icon-like selected"></span>
<output style="margin-left:0px;font-size:13px;vertical-align:bottom;"></output>
</div>`

/**
<div style="margin-left:10px;float:left;">
    <label class="ropro-switch">
  <input type="checkbox">
  <span class="ropro-slider"></span>
</label><span style="font-size:13px;font-family:Gotham;padding-top:5px;float:left;margin-top:-5px;margin-right:5px;margin-left:5px;line-height:12px;">Classic<br>Layout</span>
</div>
*/


var clocktheme = "dark"
if ($('.light-theme').length > 0) {
    var clocktheme = "light"
}

var gamesCache = []
var gamesDictCache = {}
var genreCache = []
var genreDictCache = {}
var allGames = {}
var gameBatch = []
var universeBatch = []
var currentGames = []
var topPopularLeftScroll = 0;
var genres = ["All Genres", "Simulator", "Tycoon", "Obby", "Anime", "FPS", "Pet", "Roleplay", "Escape", "Prison", "Horror", "SCP", "Planes", "Mining", "Tower Defense", "Space", "Build", "War", "Comedy", "Sports", "School", "Fighting", "Farm", "Cafe", "Vibe", "Dance", "Donate", "Avatar"]
var genreFilter = null
var customFilter = null
var filters = [chrome.i18n.getMessage("moreFilters"), "Single-player", "Gear Allowed", "Paid Access", "New Games", "Classic Games", "Recent Update", "Updated Today", "Under 1m Visits", "R15 Enabled", "Open Source"]
var searchSession = "roprogenres-" + randomString(4) + "-" + randomString(4) + "-" + randomString(4) + "-" + randomString(12)

function fetchGenres(universes) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetURL", url:"https://games.roblox.com/v1/games?universeIds=" + universes.join(",")}, 
			function(data) {
				resolve(data)
		})
	})
}

function fetchSearchResults(keyword, cursor = "") {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetURL", url:`https://apis.roblox.com/search-api/omni-search?searchQuery=${keyword}&pageToken=${cursor}&sessionId=${searchSession}&pageType=Game`},
			function(data) {
				resolve(data)
			}
		)
	})
}

function fetchPopularToday() {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetURL", url:"https://api.ropro.io/getMostPopularToday.php"},
			function(data) {
				resolve(data)
		})
	})
}

function fetchGames(page, size = 200) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetURL", url:`https://games.roblox.com/v1/games/list?model.startRows=${page * size}&model.maxRows=${size}`},
			function(data) {
				resolve(data)
		})
	})
}

function fetchUniverseDetails(universeIds) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetURL", url:"https://games.roblox.com/v1/games?universeIds=" + universeIds.join(",")},
			function(data) {
					resolve(data)
			})
	})
}

function fetchGameIcons(universeIds) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetURL", url:"https://thumbnails.roblox.com/v1/games/icons?universeIds=" + universeIds.join(",") + "&size=150x150&format=Png&isCircular=false"}, 
			function(data) {
					resolve(data)
			})
	})
}

function fetchGameThumbnails(universeIds) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetURL", url:"https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=" + universeIds.join(",") + "&countPerUniverse=1&defaults=true&size=480x270&format=Png&isCircular=false"}, 
			function(data) {
					resolve(data)
			})
	})
}

function fetchTotalPlaytimePastDay(universeIds) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetURL", url:"https://api.ropro.io/getTotalPlaytimePastDay.php?universeIds=" + universeIds.join(",")}, 
			function(data) {
					resolve(JSON.parse(data))
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

function randomString(length) {
    let result = '';
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
}

function singlePlayerSort(universe) {
	gameData = gamesDictCache[universe]
	return gameData.maxPlayers == 1
}

function gearAllowedSort(universe) {
	gameData = gamesDictCache[universe]
	return gameData.allowedGearCategories.length > 0
}

function paidAccessSort(universe) {
	gameData = gamesDictCache[universe]
	return gameData.price != null
}

function newGamesSort(universe) {
	gameData = gamesDictCache[universe]
	dateCreated = new Date(gameData.created).getTime()
	compareDate = new Date()
	compareDate.setMonth(compareDate.getMonth() - 6)
	timeElapsed = compareDate - dateCreated
	return timeElapsed <= 0
}

function classicGamesSort(universe) {
	gameData = gamesDictCache[universe]
	dateCreated = new Date(gameData.created).getTime()
	compareDate = new Date()
	compareDate.setFullYear(compareDate.getFullYear() - 5)
	timeElapsed = compareDate - dateCreated
	return timeElapsed > 0
}

function recentlyUpdatedSort(universe) {
	gameData = gamesDictCache[universe]
	dateUpdated = new Date(gameData.updated).getTime()
	compareDate = new Date()
	compareDate.setDate(compareDate.getDate() - 5)
	timeElapsed = compareDate - dateUpdated
	return timeElapsed <= 0
}

function updatedTodaySort(universe) {
	gameData = gamesDictCache[universe]
	dateUpdated = new Date(gameData.updated).getTime()
	compareDate = new Date()
	compareDate.setDate(compareDate.getDate() - 1)
	timeElapsed = compareDate - dateUpdated
	return timeElapsed <= 0
}

function underOneMillionVisitsSort(universe) {
	gameData = gamesDictCache[universe]
	return gameData.visits < 1000000
}

function rFifteenEnabledSort(universe) {
	gameData = gamesDictCache[universe]
	return (gameData.universeAvatarType == "MorphToR15" || gameData.universeAvatarType == "PlayerChoice")
}

function openSourceSort(universe) {
	gameData = gamesDictCache[universe]
	return gameData.studioAccessToApisAllowed
}


function filterGame(universe) {
	if (universe in gamesDictCache) {
		switch(customFilter) {
			case "Single-player":
				return singlePlayerSort(universe)
			case "Gear Allowed":
				return gearAllowedSort(universe)
			case "Paid Access":
				return paidAccessSort(universe)
			case "New Games":
				return newGamesSort(universe)
			case "Classic Games":
				return classicGamesSort(universe)
			case "Recent Update":
				return recentlyUpdatedSort(universe)
			case "Updated Today":
				return updatedTodaySort(universe)
			case "Under 1m Visits":
				return underOneMillionVisitsSort(universe)
			case "R15 Enabled":
				return rFifteenEnabledSort(universe)
			case "Open Source":
				return openSourceSort(universe)
			default:
				return true
		}
	}
}

async function filterCustom() {
	topPopularLeftScroll = 0
	document.getElementById('topPopular').setAttribute("data-page", "0")
	document.getElementById('topPopularList').parentNode.style.left = "0px"
	document.getElementById('topPopularList').innerHTML = ""
	document.getElementById('topPopularLoading').style.display = "block"
	var filter = document.getElementById('customLabel').innerText
	if (filter == "More Filters") {
		loadTopPopular()
		return
	}
	if (Object.keys(genreCache).length < 1000) {
		var gamesList = []
		for (var i = 0; i < 10; i++) {
			gamesList.push(fetchGames(i))
		}
		await Promise.all(gamesList).then((values) => {
			console.log(values)
			for (var i = 0; i < values.length; i++) {
				if (values[i].hasOwnProperty('games')) {
					games = values[i].games
					for (var j = 0; j < games.length; j++) {
						if (!genreDictCache.hasOwnProperty(games[j].universeId)) {
							genreCache.push(games[j])
							genreDictCache[games[j].universeId] = games[j]
						}
					}
				}
			}
		})
	}
	var validGames = {}
	var added = {}
	var universeIds = []
	console.log(genreCache.length)
	console.log(genreCache[0])
	for (var i = 0; i < genreCache.length; i++) {
			if (!added.hasOwnProperty(genreCache[i].universeId) && filterGame(genreCache[i].universeId)) {
				validGames[genreCache[i].universeId] = true
				universeIds.push(genreCache[i].universeId)
				added[genreCache[i].universeId] = true
			}
	}
	universeIds.sort(function(a, b) {
		return genreDictCache[b].playerCount - genreDictCache[a].playerCount
	})
	var universes = []
	for (var i = 0; i < universeIds.length; i++) {
		if (validGames.hasOwnProperty(universeIds[i])) {
			universes.push(universeIds[i])
		}
	}
	console.log(universes)
	universeIds = universes.slice(0, 50)
	for (var i = 0; i < Math.min(50, universeIds.length); i++) {
		addGame(document.getElementById('topPopular'), universeIds[i], genreDictCache[universeIds[i]].name, "https://www.roblox.com/games/" + parseInt(genreDictCache[universeIds[i]].placeId), "", genreDictCache[universeIds[i]].playerCount, parseInt(genreDictCache[universeIds[i]].totalUpVotes / (genreDictCache[universeIds[i]].totalUpVotes + genreDictCache[universeIds[i]].totalDownVotes) * 100))
		topPopularGames[universeIds[i]] = true
	}
	document.getElementById('topPopularLoading').style.display = "none"
	document.getElementById('topPopular').setAttribute('data-page', parseInt(document.getElementById('topPopular').getAttribute('data-page')) + 1)
	document.getElementById('topPopular').parentNode.getElementsByClassName('next')[0].classList.remove('disabled')
	setTimeout(async function() {
		totalPlaytime = await fetchTotalPlaytimePastDay(universeIds)
		for (var i = 0; i < totalPlaytime.length; i++) {
			document.getElementsByClassName('large-tile-universe-' + parseInt(totalPlaytime[i].universeid))[0].getElementsByClassName('ropro-hours-played')[0].innerText = kFormatter(totalPlaytime[i].hours) + " hours"
			document.getElementsByClassName('large-tile-universe-' + parseInt(totalPlaytime[i].universeid))[0].getElementsByClassName('ropro-hours-played')[0].title = addCommas(totalPlaytime[i].hours) + " hours played by RoPro users in the past day"
		}
	})
	universeIcons = await fetchGameThumbnails(universeIds)
	for (var i = 0; i < universeIcons.data.length; i++) {
		thumbnail = ""
		if (universeIcons.data[i].thumbnails.length > 0 && universeIcons.data[i].thumbnails[0].hasOwnProperty('imageUrl')) {
			thumbnail = universeIcons.data[i].thumbnails[0].imageUrl
		}
		genreDictCache[universeIcons.data[i].universeId]["icon"] = thumbnail
		document.getElementsByClassName('large-tile-universe-' + parseInt(universeIcons.data[i].universeId))[0].getElementsByClassName('large-game-tile-thumb')[0].src = thumbnail
	}
}

function createGenres(elem) {
	genreOptionsList = elem
	for (i = 0; i < genres.length; i++) {
		genre = genres[i]
		li = document.createElement('li')
		li.innerHTML += `
				<a genre="${stripTags(genre)}" class="genreChoice">
					<span ng-bind="tab.label" class="ng-binding">${stripTags(genre)}</span>
				</a>`
		if (genreOptionsList.getElementsByTagName('li').length < genres.length) {
			genreOptionsList.appendChild(li)
			genreChoice = li.getElementsByClassName('genreChoice')[0]
			genreChoice.addEventListener("click", function() {
				genre = this.getAttribute("genre")
				document.getElementById('topPopularGenre').innerText = stripTags(genre)
				if (genre == "All") {
					genre = null
				}
				genreFilter = genre
				filterGenres()
			})
		}
	}
}

function createCustom() {
	customOptionsList = document.getElementById('customOptions')
	for (i = 0; i < filters.length; i++) {
		custom = filters[i]
		li = document.createElement('li')
		li.innerHTML += `
				<a custom="${stripTags(custom)}" class="customChoice">
					<span ng-bind="tab.label" class="ng-binding">${stripTags(custom)}</span>
				</a>`
		if (customOptionsList.getElementsByTagName('li').length < filters.length) {
			customOptionsList.appendChild(li)
			customChoice = li.getElementsByClassName('customChoice')[0]
			customChoice.addEventListener("click", function() {
				custom = this.getAttribute("custom")
				document.getElementById('customLabel').innerHTML = custom
				if (custom == chrome.i18n.getMessage("moreFilters")) {
					custom = null
				}
				customFilter = custom
				filterCustom()
			})
		}
	}
}

async function filterGenres() {
	topPopularLeftScroll = 0
	document.getElementById('topPopular').setAttribute("data-page", "0")
	document.getElementById('topPopularList').parentNode.style.left = "0px"
	document.getElementById('topPopularList').innerHTML = ""
	document.getElementById('topPopularLoading').style.display = "block"
	var genre = document.getElementById('topPopularGenre').innerText
	if (genre == "All Genres") {
		loadTopPopular()
		return
	}
	var universes = []
	var cursor = ""
	for (var j = 0; j < 2; j++) {
		results = await fetchSearchResults(genre, cursor)
		for (var i = 0; i < results.searchResults.length; i++) {
			if (results.searchResults[i].contentGroupType == "Game") {
				universes.push(results.searchResults[i].contents[0].universeId)
				genreDictCache[results.searchResults[i].contents[0].universeId] = results.searchResults[i].contents[0]
			}
		}
		cursor = results.nextPageToken
	}
	universes.sort(function(a, b) {
		return genreDictCache[b].playerCount - genreDictCache[a].playerCount
	})
	universeIds = universes.slice(0, 50)
	for (var i = 0; i < Math.min(50, universeIds.length); i++) {
		addGame(document.getElementById('topPopular'), universeIds[i], genreDictCache[universeIds[i]].name, "https://www.roblox.com/games/" + parseInt(genreDictCache[universeIds[i]].rootPlaceId), "", genreDictCache[universeIds[i]].playerCount, parseInt(genreDictCache[universeIds[i]].totalUpVotes / (genreDictCache[universeIds[i]].totalUpVotes + genreDictCache[universeIds[i]].totalDownVotes) * 100))
		topPopularGames[universeIds[i]] = true
	}
	document.getElementById('topPopularLoading').style.display = "none"
	document.getElementById('topPopular').setAttribute('data-page', parseInt(document.getElementById('topPopular').getAttribute('data-page')) + 1)
	document.getElementById('topPopular').parentNode.getElementsByClassName('next')[0].classList.remove('disabled')
	setTimeout(async function() {
		totalPlaytime = await fetchTotalPlaytimePastDay(universeIds)
		for (var i = 0; i < totalPlaytime.length; i++) {
			document.getElementsByClassName('large-tile-universe-' + parseInt(totalPlaytime[i].universeid))[0].getElementsByClassName('ropro-hours-played')[0].innerText = kFormatter(totalPlaytime[i].hours) + " hours"
			document.getElementsByClassName('large-tile-universe-' + parseInt(totalPlaytime[i].universeid))[0].getElementsByClassName('ropro-hours-played')[0].title = addCommas(totalPlaytime[i].hours) + " hours played by RoPro users in the past day"
		}
	})
	universeIcons = await fetchGameThumbnails(universeIds)
	for (var i = 0; i < universeIcons.data.length; i++) {
		thumbnail = ""
		if (universeIcons.data[i].thumbnails.length > 0 && universeIcons.data[i].thumbnails[0].hasOwnProperty('imageUrl')) {
			thumbnail = universeIcons.data[i].thumbnails[0].imageUrl
		}
		genreDictCache[universeIcons.data[i].universeId]["icon"] = thumbnail
		document.getElementsByClassName('large-tile-universe-' + parseInt(universeIcons.data[i].universeId))[0].getElementsByClassName('large-game-tile-thumb')[0].src = thumbnail
	}
}

function filterLikeRatio(ratio) {
	ratio = parseInt(ratio)
	for (universe in allGames) {
		game = allGames[universe]
		for (i = 0; i < game[0].length; i++) {
			gameCard = game[0][i]
			if (gameCard.getElementsByClassName('info-label vote-percentage-label').length > 0) {
				gameRatio = parseInt(gameCard.getElementsByClassName('info-label vote-percentage-label')[0].innerHTML.replace("%", ""))
				if (gameRatio < ratio) {
					gameCard.style.display = "none"
				} else {
					if (currentGames.length == 0 || currentGames.includes(gameCard)) {
						gameCard.style.display = "inline-block"
					}
				}
			} else {
				if (ratio != 50) {
					gameCard.style.display = "none"
				}
			}
		}
	}
	if (ratio != 50 && document.getElementById('popularToday') != null) {
		document.getElementById('popularToday').parentNode.style.display = "none"
	} else if (document.getElementById('popularToday') != null) {
		document.getElementById('popularToday').parentNode.style.display = "block"
	}
}

function getPageLeft(el) {
    var rect = el.getBoundingClientRect();
    var docEl = document.documentElement;
    return rect.left + (window.pageXOffset || docEl.scrollLeft || 0)
}

function getPageTop(el) {
    var rect = el.getBoundingClientRect();
    var docEl = document.documentElement;
    return rect.top + (window.pageYOffset || docEl.scrollTop || 0)
}

var mainGamesPage = false
var inserted = false

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

function kFormatter(num) {
    return Math.abs(num) > 999 ? Math.abs(num) > 999999 ? Math.sign(num)*((Math.abs(num)/1000000).toFixed(1)) + 'm' : Math.sign(num)*((Math.abs(num)/1000).toFixed(1)) + 'k' : Math.sign(num)*Math.abs(num)
}

function kFormatter2(num) {
    return Math.abs(num) > 999 ? Math.abs(num) > 999999 ? Math.sign(num)*((Math.abs(num)/1000000).toFixed(1)) + 'M' : Math.sign(num)*((Math.abs(num)/1000).toFixed(1)) + 'K' : Math.sign(num)*Math.abs(num)
}

function addGame(gameElement, universeId, gameName, gameLink, gameIcon, players, likeRatio) {
	/**gameHTML = `<li class="popular-today-card list-item game-card game-tile universe-${parseInt(universeId)}" id="${parseInt(universeId)}" title="${stripTags(gameName)}" style="display: inline-block;"><div class="game-card-container"><a class="game-card-link" href="${stripTags(gameLink)}" id="${parseInt(universeId)}"><div class="game-card-thumb-container"><span class="thumbnail-2d-container game-card-thumb"><img class="" src="${stripTags(gameIcon)}" alt="${stripTags(gameName)}" title="${stripTags(gameName)}"></span></div><div class="game-card-name game-name-title" title="${stripTags(gameName)}">${stripTags(gameName)}</div>
	<div data-testid="game-tile-card-info" class="game-card-info"><span class="info-label icon-votes-gray"></span><span data-testid="game-tile-card-info-vote-label" class="info-label vote-percentage-label">${parseInt(likeRatio)}%</span><span class="info-label icon-playing-counts-gray"></span><span class="info-label playing-counts-label" title="${parseInt(players)}">${kFormatter2(parseInt(players))}</span></div>
	</a></div></li>`**/
	gameHTML = `<div title="${stripTags(gameName)}" class="large-game-tile game-tile-container large-tile-universe-${universeId}">
	<a href="${stripTags(gameLink)}" class="game-card-link large-game-tile-container">
	  <div class="cursor-pointer">
		<div class="large-game-tile-thumb-container placeholder-game-thumbnail" style="overflow:hidden;border-radius:10px;">
		  <img class="placeholder-game-thumbnail large-game-tile-thumb" src="${stripTags(gameIcon)}" />
		</div>
		<div class="large-game-tile-overlay" style="border-radius:10px;">
		  <div class="large-game-tile-info-container">
			<h1 class="text-overflow large-game-tile-name">${stripTags(gameName)}</h1>
			<div class="game-card-info large-game-tile-info">
			  <span class="info-label icon-votes-gray-white-70"></span>
			  <span class="info-label vote-percentage-label">${parseInt(likeRatio)}%</span>
			  <span class="info-label icon-playing-counts-gray-white-70"></span>
			  <span class="info-label playing-counts-label" title="${players} active players">${addCommas(players)}</span>
			  <img style="margin-left:10px;background-image:none;width:16px;" src="${chrome.runtime.getURL('/images/timer_dark.svg')}" class="info-label icon-pastname">
			  <span class="info-label ropro-hours-played" title="--- hours played by RoPro users in the past day">--- hours</span>
			</div>
		  </div>
		</div>
	  </div>
	</div>
  </div>`
	if (gameElement != null) {
		gameCards = gameElement.parentNode.getElementsByClassName('game-cards')[0]
		gameCards.innerHTML += gameHTML
	}
}

function addPopularGame(universeId, gameName, gameLink, gameIcon, hours) {
	gameHTML = `<li class="popular-today-card list-item game-card game-tile universe-${parseInt(universeId)}" id="${parseInt(universeId)}" title="${stripTags(gameName)}" style="display: inline-block;"><div class="game-card-container"><a class="game-card-link" href="${stripTags(gameLink)}" id="${parseInt(universeId)}"><div class="game-card-thumb-container"><span class="thumbnail-2d-container game-card-thumb"><img class="" src="${stripTags(gameIcon)}" alt="${stripTags(gameName)}" title="${stripTags(gameName)}"></span></div><div class="game-card-name game-name-title" title="${stripTags(gameName)}">${stripTags(gameName)}</div><div style="margin-top:-4px;" class="game-card-info">
    <img style="background-image:none;margin:-6px;margin-top:0px;margin-bottom:0.5px;transform:scale(0.4);border:none;margin-left:-8px;margin-top:-0.6px;margin-right:-9px;" src="${chrome.runtime.getURL(`/images/timer_${stripTags(clocktheme)}.svg`)}" class="info-label icon-pastname"><span style="font-size:10.5px;" title="Played for ${addCommas(parseInt(hours).toString())} hours by RoPro users in the last 24 hours" class="info-label vote-percentage-label">${kFormatter(parseInt(hours))} Hours Today</span>
    </div></a></div></li>`
	popularToday = document.getElementById('popularToday')
	if (popularToday != null) {
		gameCards = popularToday.parentNode.getElementsByClassName('game-cards')[0]
		gameCards.innerHTML += gameHTML
	}
}

var topPopularGames = {}

async function loadTopPopular() {
	page = parseInt(document.getElementById('topPopular').getAttribute('data-page'))
	if (page == 0) {
		topPopularGames = {}
	}
	for (var i = 0; i < 1; i++) {
		var games = await fetchGames(i + page)
		games = games.games
		for (var j = 0; j < games.length; j++) {
			if (!gamesDictCache.hasOwnProperty(games[j].universeId)) {
				gamesCache.push(games[j])
				gamesDictCache[games[j].universeId] = games[j]
			}
		}
	}
	var universeIds = []
	for (var i = 0; i < gamesCache.length; i++) {
		if (!topPopularGames.hasOwnProperty(gamesCache[i].universeId)) {
			universeIds.push(gamesCache[i].universeId)
		}
	}
	document.getElementById('topPopularLoading').style.display = "none"
	universeIds.sort(function(a, b) {
		return gamesDictCache[b].playerCount - gamesDictCache[a].playerCount
	})
	universeIds = universeIds.slice(0, 50)
	for (var i = 0; i < Math.min(50, universeIds.length); i++) {
		addGame(document.getElementById('topPopular'), universeIds[i], gamesDictCache[universeIds[i]].name, "https://www.roblox.com/games/" + parseInt(gamesDictCache[universeIds[i]].placeId), "", gamesDictCache[universeIds[i]].playerCount, parseInt(gamesDictCache[universeIds[i]].totalUpVotes / (gamesDictCache[universeIds[i]].totalUpVotes + gamesDictCache[universeIds[i]].totalDownVotes) * 100))
		topPopularGames[universeIds[i]] = true
	}
	document.getElementById('topPopular').setAttribute('data-page', parseInt(document.getElementById('topPopular').getAttribute('data-page')) + 1)
	document.getElementById('topPopular').parentNode.getElementsByClassName('next')[0].classList.remove('disabled')
	setTimeout(async function() {
		totalPlaytime = await fetchTotalPlaytimePastDay(universeIds)
		for (var i = 0; i < totalPlaytime.length; i++) {
			document.getElementsByClassName('large-tile-universe-' + parseInt(totalPlaytime[i].universeid))[0].getElementsByClassName('ropro-hours-played')[0].innerText = kFormatter(totalPlaytime[i].hours) + " hours"
			document.getElementsByClassName('large-tile-universe-' + parseInt(totalPlaytime[i].universeid))[0].getElementsByClassName('ropro-hours-played')[0].title = addCommas(totalPlaytime[i].hours) + " hours played by RoPro users in the past day"
		}
	})
	universeIcons = await fetchGameThumbnails(universeIds.slice(0, 5))
	for (var i = 0; i < universeIcons.data.length; i++) {
		thumbnail = ""
		if (universeIcons.data[i].thumbnails.length > 0 && universeIcons.data[i].thumbnails[0].hasOwnProperty('imageUrl')) {
			thumbnail = universeIcons.data[i].thumbnails[0].imageUrl
		}
		gamesDictCache[universeIcons.data[i].universeId]["icon"] = thumbnail
		document.getElementsByClassName('large-tile-universe-' + parseInt(universeIcons.data[i].universeId))[0].getElementsByClassName('large-game-tile-thumb')[0].src = thumbnail
	}
	universeIcons = await fetchGameThumbnails(universeIds.slice(5, 50))
	for (var i = 0; i < universeIcons.data.length; i++) {
		thumbnail = ""
		if (universeIcons.data[i].thumbnails.length > 0 && universeIcons.data[i].thumbnails[0].hasOwnProperty('imageUrl')) {
			thumbnail = universeIcons.data[i].thumbnails[0].imageUrl
		}
		gamesDictCache[universeIcons.data[i].universeId]["icon"] = thumbnail
		document.getElementsByClassName('large-tile-universe-' + parseInt(universeIcons.data[i].universeId))[0].getElementsByClassName('large-game-tile-thumb')[0].src = thumbnail
	}
}

async function loadPopularToday() {
	popularTodayRow = document.getElementById('popularToday')
	var popularToday = await fetchPopularToday()
	popularToday = JSON.parse(popularToday)
	var universeIds = []
	var universeDict = {}
	for (i = 0; i < popularToday.length; i++) {
		universeIds.push(popularToday[i].universeid)
		universeDict[popularToday[i].universeid] = {"hours": popularToday[i].hours}
	}
	universeDetails = await fetchUniverseDetails(universeIds)
	universeIcons = await fetchGameIcons(universeIds)
	for (i = 0; i < universeDetails.data.length; i++) {
		universeDict[universeDetails.data[i].id] = {"name": universeDetails.data[i].name, "link": "https://www.roblox.com/games/" + universeDetails.data[i].rootPlaceId, "hours": universeDict[universeDetails.data[i].id].hours}
	}
	for (i = 0; i < universeIcons.data.length; i++) {
		universeDict[universeIcons.data[i].targetId]["icon"] = universeIcons.data[i].imageUrl
	}
	document.getElementById('popularTodayLoading').style.display = "none"
	for (i = 0; i < universeIds.length; i++) {
		addPopularGame(universeIds[i], universeDict[universeIds[i]].name, universeDict[universeIds[i]].link, universeDict[universeIds[i]].icon, universeDict[universeIds[i]].hours)
	}
}

function getOffset( el ) {
    var _x = 0;
    var _y = 0;
    while( el && !isNaN( el.offsetLeft ) && !isNaN( el.offsetTop ) ) {
        _x += el.offsetLeft - el.scrollLeft;
        _y += el.offsetTop - el.scrollTop;
        el = el.offsetParent;
    }
    return { top: _y, left: _x };
}

async function addTopPopular() {
	if (await fetchSetting("mostPopularSort")) {
		topPopularHTML = `<div id="topPopular" data-page="0" class="container-header games-filter-changer top-popular"><h3>Most Popular</h3></div></a><div class="horizontal-scroller games-list"><span id="topPopularLoading" style="position:absolute; top:0px; right:0px; display: block; width: 100px; height: 120px; visibility: initial !important;margin-right:calc(50% - 50px);margin-top:10px;transform:scale(1);" class="spinner spinner-default"></span><div class="clearfix horizontal-scroll-window" style="overflow-x:clip;overflow-y:visible;"><div class="horizontally-scrollable" style="left: 0px;"><ul id="topPopularList" class="hlist games game-cards game-tile-list"></ul></div><div style="height:270px;z-index:2;" class="scroller prev disabled" role="button" aria-hidden="true"><div class="arrow"><span class="icon-games-carousel-left"></span></div></div><div style="height:270px;z-index:2;" class="scroller next" role="button" aria-hidden="true"><div class="arrow"><span class="icon-games-carousel-right"></span></div></div></div></div>`
		var div = document.createElement('div')
		div.setAttribute('class', 'games-list-container is-windows')
		div.setAttribute('style', 'margin-bottom:30px;')
		div.innerHTML += topPopularHTML
		document.getElementsByClassName('games-list-container')[0].parentNode.insertBefore(div, document.getElementsByClassName('games-list-container')[0])
		if (document.getElementsByClassName('top-popular').length <= 1) {
			loadTopPopular()
		}
		div.getElementsByClassName('scroller next')[0].addEventListener('click', function(){
			horizontalScroll = this.parentNode.getElementsByClassName('horizontally-scrollable')[0]
			scrollNext = this.parentNode.getElementsByClassName('scroller next')[0]
			scrollPrev = this.parentNode.getElementsByClassName('scroller prev')[0]
			difference = getOffset(scrollNext).left - getOffset(scrollPrev).left
			cardWidth = $(this.parentNode.getElementsByClassName('large-game-tile')[0]).outerWidth(true)
			if (!this.classList.contains("disabled")) {
				topPopularLeftScroll = topPopularLeftScroll - Math.floor(difference / cardWidth) * cardWidth
				horizontalScroll.style.left = topPopularLeftScroll + "px"
				if (!scrollNext.classList.contains('disabled') && this.parentNode.getElementsByClassName('large-game-tile').length < Math.abs(Math.floor(topPopularLeftScroll / cardWidth)) + Math.ceil(difference / cardWidth)) {
					scrollNext.classList.add("disabled")
					if (document.getElementById('topPopularGenre') == null || document.getElementById('topPopularGenre').innerText == "All Genres") {
						loadTopPopular()
					}
				}
				if (Math.abs(Math.floor(topPopularLeftScroll / cardWidth)) > 0) {
					scrollPrev.classList.remove("disabled")
				}
			}
		})
		div.getElementsByClassName('scroller prev')[0].addEventListener('click', function(){
			horizontalScroll = this.parentNode.getElementsByClassName('horizontally-scrollable')[0]
			scrollNext = this.parentNode.getElementsByClassName('scroller next')[0]
			scrollPrev = this.parentNode.getElementsByClassName('scroller prev')[0]
			difference = getOffset(scrollNext).left - getOffset(scrollPrev).left
			cardWidth = $(this.parentNode.getElementsByClassName('large-game-tile')[0]).outerWidth(true)
			if (!this.classList.contains("disabled")) {
				topPopularLeftScroll = topPopularLeftScroll + Math.floor(difference / cardWidth) * cardWidth
				if (topPopularLeftScroll > 0) {
					topPopularLeftScroll = 0
				}
				horizontalScroll.style.left = topPopularLeftScroll + "px"
				if (Math.abs(Math.floor(topPopularLeftScroll / cardWidth)) == 0) {
					scrollPrev.classList.add("disabled")
				}
				if (this.parentNode.getElementsByClassName('large-game-tile').length >= Math.abs(Math.floor(topPopularLeftScroll / cardWidth)) + Math.ceil(difference / cardWidth)) {
					scrollNext.classList.remove("disabled")
				}
			}
		})
		$('.games-filter-changer').click(function() {
			if (this.id != 'topPopular' && this.id != 'popularToday') {
				div.style.display = "none"
			}
		})
		var filterDiv = document.createElement('div')
		document.getElementById('topPopular').appendChild(filterDiv)
		if (await fetchSetting("genreFilters")) {
			var genreDiv = document.createElement('div')
			genreDiv.innerHTML = genreDropdownHTML
			filterDiv.appendChild(genreDiv.childNodes[0])
			createGenres(document.getElementById('topPopularGenreList'))
		}
		/**if (true || await fetchSetting("moreGameFilters")) {
			var customDiv = document.createElement('div')
			customDiv.innerHTML = customDropdownHTML
			filterDiv.appendChild(customDiv.childNodes[0])
			createCustom(document.getElementById('customOptions'))
		}
		if (true || await fetchSetting('gameLikeRatioFilter')) {
			var likeDiv = document.createElement('div')
			likeDiv.innerHTML = likeRatioSliderHTML
			filterDiv.appendChild(likeDiv.childNodes[0])
		} */
	}
}

async function addRoProPopular() {
	if (await fetchSetting("popularToday") && document.getElementById('popularToday') == null) {
		leftScroll = 0;
		roProPopularHTML = `<div id="popularToday" class="container-header games-filter-changer popular-today"><h3>Popular Today With RoPro Users</h3></div></a><div class="horizontal-scroller games-list"><span id="popularTodayLoading" style="position:absolute; top:0px; right:0px; display: block; width: 100px; height: 120px; visibility: initial !important;margin-right:calc(50% - 50px);margin-top:10px;transform:scale(1);" class="spinner spinner-default"></span><div class="clearfix horizontal-scroll-window" style="overflow:hidden;"><div class="horizontally-scrollable" style="left: 0px;"><ul class="hlist games game-cards game-tile-list"></ul></div><div class="scroller prev disabled" role="button" aria-hidden="true"><div class="arrow"><span class="icon-games-carousel-left"></span></div></div><div class="scroller next" role="button" aria-hidden="true"><div class="arrow"><span class="icon-games-carousel-right"></span></div></div></div></div>`
		var div = document.createElement('div')
		div.setAttribute('class', 'games-list-container is-windows')
		div.innerHTML += roProPopularHTML
		for (i = 0; i < document.getElementsByClassName('games-list-container').length; i++) {
			container = document.getElementsByClassName('games-list-container')[i]
			if (container.getElementsByTagName('h3')[0].innerHTML == "Popular" && document.getElementById('popularToday') == null) {
				container.parentNode.insertBefore(div, container.nextElementSibling)
			}
		}
		if (document.getElementsByClassName('popular-today').length == 0 || document.getElementsByClassName('popular-today').length == 1) {
			loadPopularToday()
		}
		div.getElementsByClassName('scroller next')[0].addEventListener('click', function(){
			horizontalScroll = this.parentNode.getElementsByClassName('horizontally-scrollable')[0]
			scrollNext = this.parentNode.getElementsByClassName('scroller next')[0]
			scrollPrev = this.parentNode.getElementsByClassName('scroller prev')[0]
			difference = getOffset(scrollNext).left - getOffset(scrollPrev).left
			cardWidth = this.parentNode.getElementsByClassName('game-card')[0].offsetWidth
			if (!this.classList.contains("disabled")) {
				leftScroll = leftScroll - Math.floor(difference / cardWidth) * cardWidth
				horizontalScroll.style.left = leftScroll + "px"
				if (this.parentNode.getElementsByClassName('game-card').length < Math.abs(Math.floor(leftScroll / cardWidth)) + Math.ceil(difference / cardWidth)) {
					scrollNext.classList.add("disabled")
				}
				if (Math.abs(Math.floor(leftScroll / cardWidth)) > 0) {
					scrollPrev.classList.remove("disabled")
				}
			}
		})
		div.getElementsByClassName('scroller prev')[0].addEventListener('click', function(){
			horizontalScroll = this.parentNode.getElementsByClassName('horizontally-scrollable')[0]
			scrollNext = this.parentNode.getElementsByClassName('scroller next')[0]
			scrollPrev = this.parentNode.getElementsByClassName('scroller prev')[0]
			difference = getOffset(scrollNext).left - getOffset(scrollPrev).left
			cardWidth = this.parentNode.getElementsByClassName('game-card')[0].offsetWidth
			if (!this.classList.contains("disabled")) {
				leftScroll = leftScroll + Math.floor(difference / cardWidth) * cardWidth
				if (leftScroll > 0) {
					leftScroll = 0
				}
				horizontalScroll.style.left = leftScroll + "px"
				if (Math.abs(Math.floor(leftScroll / cardWidth)) == 0) {
					scrollPrev.classList.add("disabled")
				}
				if (this.parentNode.getElementsByClassName('game-card').length >= Math.abs(Math.floor(leftScroll / cardWidth)) + Math.ceil(difference / cardWidth)) {
					scrollNext.classList.remove("disabled")
				}
			}
		})
		$('.games-filter-changer').click(function() {
			if (this.id != 'topPopular' && this.id != 'popularToday') {
				div.style.display = "none"
			}
		})
	}
}

var myInterval = setInterval(function(){
    if (document.getElementsByClassName('container-header games-filter-changer').length > 0) {
		clearInterval(myInterval)
        if (document.getElementsByClassName('container-header games-filter-changer').length > 1) {
			addTopPopular()
			//addRoProPopular()
        }
    }
}, 100)