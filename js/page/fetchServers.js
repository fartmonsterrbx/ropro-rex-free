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

var serverContainerInterval = setInterval(function(){ 
	serverContainer = document.getElementById('rbx-game-server-item-container')
	if (serverContainer != null) {
		servers = $('.rbx-game-server-item:not(.ropro-checked)')
		for (var i = 0; i < servers.length; i++) {
			var server = servers.get(i)
			try {
				serverProps = angular.element(server).context[Object.keys(angular.element(server).context)[0]].return.memoizedProps
				gameId = serverProps.id
				placeId = serverProps.placeId
				if (gameId.length > 0) {
					server.setAttribute('data-gameid', gameId)
					server.setAttribute('data-placeid', placeId)
				}
			} catch(e) {
			}
			servers.get(i).classList.add('ropro-checked')
		}
	}
	serverContainer = document.getElementById('rbx-friends-game-server-item-container')
	if (serverContainer != null) {
		servers = $('.rbx-friends-game-server-item:not(.ropro-checked)')
		for (var i = 0; i < servers.length; i++) {
			var server = servers.get(i)
			try {
				var serverProps = angular.element(server).context[Object.keys(angular.element(server).context)[0]].alternate.return.memoizedProps
				var gameId = serverProps.id
				var placeId = serverProps.placeId
				if (gameId.length > 0) {
					server.setAttribute('data-gameid', gameId)
					server.setAttribute('data-placeid', placeId)
				}
			} catch(e) {
				console.log(e)
			}
			servers.get(i).classList.add('ropro-checked')
		}
	}
	serverContainer = document.getElementById('rbx-private-game-server-item-container')
	if (serverContainer != null) {
		servers = $('.rbx-private-game-server-item:not(.ropro-checked)')
		for (var i = 0; i < servers.length; i++) {
			var server = servers.get(i)
			try {
				var serverProps = angular.element(server).context[Object.keys(angular.element(server).context)[0]].alternate.return.memoizedProps
				var accessCode = serverProps.accessCode
				if (gameId.length > 0) {
					server.setAttribute('data-accesscode', accessCode)
				}
			} catch(e) {
			}
			servers.get(i).classList.add('ropro-checked')
		}
	}
}, 1000)