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

if ($('.light-theme').length > 0) {
    var current_theme = "lightmode"
} else {
    var current_theme = "darkmode"
}

var originalSorts = []
var sortsDict = {}

iframeHTML = '<iframe id="randomGameFrame" class="random-game-iframe" style="background-color:black;position:absolute;right:40px;top:35px;" src=""></iframe>'
randomGameButtonHTML = `<a id="randomGameButton" class="btn-growth-md btn-secondary-md random-game-button" style="border-radius:0px;text-align:right;width:auto;min-width:179px;position:absolute;right:40px;border:none;"><img class="random-game-icon-${current_theme}" style="width:25px;margin-top:-10px;margin-bottom:-10px;margin-right:8px;${current_theme == "darkmode" ? "filter:invert(0.8);" : "filter:invert(0.2);"}" src="${chrome.runtime.getURL('/images/random_game.svg')}">`+ chrome.i18n.getMessage("RandomGame") +`</a>`
src = "https://ropro.io/dice/?chance=50"
choicesSliderHTML = `<div id="choicesSliderDiv" style="display:none;position:absolute;width:230px;right:170px;margin-top:3px;">
<output style="font-size:13px;float:left;margin-left:-30px;margin-right:5px;margin-top:2px;">Top 50 Experiences</output>
<input id="choicesRatio" oninput="this.previousElementSibling.value = 'Top ' + Math.floor(Math.pow(this.value, 2.1)/10)*10 + ' Experiences'" value="6.5" step="0.02" max="37.32" min="3" type="range" style="float:right;width:100px;">
</div>`
reorderHTML = `<a id="reorderButton" class="btn-growth-md btn-secondary-md reorder-button" style="border-radius:0px;width:130px;position:absolute;right:30px;text-align:right;display:none;"><img class="reorder-inactive" style="width:35px;position:absolute;top:-1.5px;left:4px;" src="${chrome.runtime.getURL('/images/reorder_inactive.png')}"><img class="reorder-active" style="width:35px;position:absolute;top:-1.5px;left:4px;" src="${chrome.runtime.getURL('/images/reorder_active.png')}">Re-Order</a>`
orderedListHTML = '<div id="orderedListDiv" class="btn-growth-md btn-secondary-md reorder-div" style="border-radius:0px;width:319px;position:absolute;right:30px;top:36px;text-align:right;min-height:100px;display:none;"><div id="orderedListDivInner" style="position:absolute;z-index:9;"></div></div>'
function fetchSetting(setting) {
	return new Promise(resolve => {
		chrome.runtime.sendMessage({greeting: "GetSetting", setting: setting}, 
			function(data) {
				resolve(data)
			}
		)
	})
}

function getPageTop(el) {
    var rect = el.getBoundingClientRect();
    var docEl = document.documentElement;
    return rect.top + (window.pageYOffset || docEl.scrollTop || 0)
}

function dragElement(elmnt) {
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    //elmnt.addEventListener('dragstart', dragMouseDown)
  
    function dragMouseDown(e) {
      e = e || window.event;
      e.preventDefault();
      // get the mouse cursor position at startup:
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.addEventListener('mouseup', closeDragElement);
      // call a function whenever the cursor moves:
      document.addEventListener('mousemove', elementDrag);
    }
    topPos = getPageTop(elmnt.parentNode.childNodes[0])
    function elementDrag(e) {
      e = e || window.event;
      e.preventDefault();
      // calculate the new cursor position:
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      // set the element's new position:
      //elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
      //elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
    }
  
    function closeDragElement() {
      // stop moving when mouse button is released:
      document.removeEventListener('mouseup', closeDragElement);
      document.removeEventListener('mousemove', elementDrag);
    }
}

function SwapNode(N1, N2)  {
    N1 = $(N1);
    N2 = $(N2);
    
    if (N1 && N2) {
        var P1 = N1.parentNode;
        var T1 = document.createElement("span");    
        P1.insertBefore(T1, N1);
    
        var P2 = N2.parentNode;
        var T2 = document.createElement("span");
        P2.insertBefore(T2, N2);
    
        P1.insertBefore(N2, T1);
        P2.insertBefore(N1, T2);
    
        P1.removeChild(T1);
        P2.removeChild(T2);
    }
}
function addSorts() {
    filters = document.getElementsByClassName('container-header games-filter-changer')
    document.getElementById('orderedListDivInner').innerHTML = "<p style='margin-bottom:8px;'><b style='margin-top:-5px;font-size:12px;font-header;text-align:center;font-weight:bold;'>Click and drag a sort to re-order games page.</b></p>"
    document.getElementById('orderedListDiv').style.height = (document.getElementsByClassName('container-header games-filter-changer').length + 3) * 46 + "px"
    for (i = 0; i < filters.length; i++) {
        filter = filters[i]
        filterTitle = stripTags(filter.getElementsByTagName('h3')[0].innerHTML.split(" (")[0])
        sortHTML = `<a draggable="true" ondragend='this.setAttribute("pos", (this.parentNode.childNodes[0].getBoundingClientRect().top + window.pageYOffset - window.scrollY - window.event.clientY + 20) * -1); this.classList.add("sort-swapped")' class="sort-button-${parseInt(i)} btn-growth-md btn-secondary-md sort-button" style="width:299px;text-align:left;margin-bottom:10px;position:absolute;z-index:10;left:0px;top:${parseInt(46*(i + 1) - 15)}px"><img draggable="false" style="position:absolute;width:20px;right:10px;top:6px;z-index:-2;" class="sort-image" src="${chrome.runtime.getURL('/images/listicon_darkmode_inactive.png')}"><b>${filterTitle}</b></a>`
        document.getElementById('orderedListDivInner').innerHTML += sortHTML
    }
    document.getElementById('orderedListDivInner').innerHTML += `<li class="rbx-upgrade-now"><a id="saveOrder" style="width:299px;background-color:#0082DB;color:white;margin-bottom:5px;position:absolute;left:0px;" class="btn-growth-md btn-secondary-md save-order" id="upgrade-now-button">Save Order</a></li><li class="rbx-upgrade-now"><a id="resetOrder" class="btn-growth-md btn-secondary-md reset-order" style="width:299px;background-color:#FFFFFF;color:black;position:absolute;left:0px;" id="upgrade-now-button">Reset Order</a></li>`
    document.getElementById('saveOrder').style.top = (filters.length + 1) * 46 - 15 + "px"
    document.getElementById('resetOrder').style.top = (filters.length + 2) * 46 - 15 + "px"
    document.getElementById('resetOrder').addEventListener('click', function(){
        renderOrder(originalSorts)
    })
}

function addReorderButton() {
    var checkInterval;
    reorderButton = document.getElementById("reorderButton")
    reorderButton.style.display = "block"
	reorderButton.addEventListener("click", function() {
		if (reorderButton.innerHTML.includes("Re-Order")) {
            reorderButton.parentNode.style.zIndex = 10000
            reorderButton.innerHTML = "Close"
            reorderButton.style.textAlign = "center"
            orderedListDiv.style.display = "block"
            addSorts()
            for (i = 0; i < document.getElementsByClassName('sort-button').length; i++) {
                dragElement(document.getElementsByClassName('sort-button')[i])
            }
            checkInterval = setInterval(function(){
                sortSwapped = $(".sort-swapped")
                if (sortSwapped.length > 0) {
                    thisElem = sortSwapped.get(0)
                    thisElem.classList.remove("sort-swapped")
                    thisIndex = parseInt(thisElem.getAttribute("class").split("sort-button-")[1].split(" ")[0])
                    pos = parseInt(thisElem.getAttribute("pos"))
                    index = Math.floor(pos / 46)
                    thisTop = thisElem.style.top;
                    others = document.getElementsByClassName("sort-button-" + index);
                    if (others.length > 0) {
                        other = others[0]
                        otherTop = other.style.top;
                        other.style.top = thisTop;
                        thisElem.style.top = otherTop;
                        thisClass = thisElem.getAttribute("class");
                        thisElem.setAttribute("class", stripTags(other.getAttribute("class")));
                        other.setAttribute("class", stripTags(thisClass));
                        gameSorts = document.getElementsByClassName('container-header games-filter-changer')
                        thisSortChild = gameSorts[thisIndex]
                        otherSortChild = gameSorts[index]
                        thisSort = gameSorts[thisIndex].parentNode.parentNode
                        otherSort = gameSorts[index].parentNode.parentNode
                        if (thisIndex == 0) {
                            thisSortChild.getElementsByTagName('br')[0].remove()
                            thisSortChild.getElementsByTagName('br')[0].remove()
                            otherSortChild.insertBefore(document.createElement('br'), otherSortChild.getElementsByTagName('h3')[0])
                            otherSortChild.insertBefore(document.createElement('br'), otherSortChild.getElementsByTagName('h3')[0])
                        } else if (index == 0) {
                            otherSortChild.getElementsByTagName('br')[0].remove()
                            otherSortChild.getElementsByTagName('br')[0].remove()
                            thisSortChild.insertBefore(document.createElement('br'), thisSortChild.getElementsByTagName('h3')[0])
                            thisSortChild.insertBefore(document.createElement('br'), thisSortChild.getElementsByTagName('h3')[0])
                        }
                        thisSortNext = thisSort.nextElementSibling
                        otherSortNext = otherSort.nextElementSibling
                        thisSort.parentNode.insertBefore(thisSort, otherSort)
                        if (thisSortNext == null) {
                            thisSort.parentNode.appendChild(otherSort)
                        } else if (otherSortNext != null) {
                            if (otherSort == thisSortNext) {
                                thisSort.parentNode.insertBefore(otherSort, thisSort)
                            } else {
                                thisSort.parentNode.insertBefore(otherSort, thisSortNext)
                            }
                        } else {
                            thisSort.parentNode.appendChild(thisSort)
                        }
                    }
                }
            }, 100)
		} else {
            reorderButton.parentNode.style.zIndex = 1
            reorderButton.style.textAlign = "right"
			reorderButton.innerHTML = `<img class="reorder-inactive" style="width:35px;position:absolute;top:-1.5px;left:4px;" src="${chrome.runtime.getURL('/images/reorder_inactive.png')}"><img class="reorder-active" style="width:35px;position:absolute;top:-1.5px;left:4px;" src="${chrome.runtime.getURL('/images/reorder_active.png')}">Re-Order`
			orderedListDiv.style.display = "none"
		}
    })
}

function createRandomGameButton() {
	div = document.createElement("div")
	div.style.position = "absolute"
	div.style.right = "0px"
	div.style.zIndex = "1"
	div.innerHTML += choicesSliderHTML
	div.innerHTML += randomGameButtonHTML
    div.innerHTML += iframeHTML
    //div.innerHTML += reorderHTML
    div.innerHTML += orderedListHTML
	contentWindow = document.getElementsByClassName('content')[0]
	contentWindow.insertBefore(div, contentWindow.childNodes[0])
	iframe = document.getElementById("randomGameFrame")
    randomGameButton = document.getElementById("randomGameButton")
    orderedListDiv = document.getElementById("orderedListDiv")
    randomGameButton.addEventListener("click", function() {
		if (randomGameButton.innerHTML.includes(chrome.i18n.getMessage("RandomGame"))) {
            randomGameButton.parentNode.style.zIndex = 100000
            randomGameButton.innerHTML = "Close"
            randomGameButton.style.textAlign = "center"
			document.getElementById('choicesSliderDiv').style.display = "block"
			iframe.src = src
			iframe.style.display = "block"
			setTimeout(function(){
			iframe.classList.add("random-game-iframe-open")
			},100)
		} else {
            randomGameButton.parentNode.style.zIndex = 1
            randomGameButton.style.textAlign = "right"
			randomGameButton.innerHTML = `<img class="random-game-icon-${current_theme}" style="width:25px;margin-top:-10px;margin-bottom:-10px;margin-right:8px;${current_theme == "darkmode" ? "filter:invert(0.8);" : "filter:invert(0.2);"}" src="${chrome.runtime.getURL('/images/random_game.svg')}">`+ chrome.i18n.getMessage("RandomGame")
			document.getElementById('choicesSliderDiv').style.display = "none"
			iframe.src = ""
			iframe.style.display = "none"
			iframe.classList.remove("random-game-iframe-open")
		}
	})
	document.getElementById('choicesRatio').addEventListener("change", function() {
		iframe.src = "https://ropro.io/dice/?chance=" + Math.floor(Math.pow(this.value, 2.1)/10)*10
	})
}

function renderOrder(sorts) {
    for (i = sorts.length - 1; i >= 0; i--) {
        sort = sorts[i]
        if (sort in sortsDict) {
            if (sortsDict[sort].getElementsByTagName('br').length == 2) {
                sortsDict[sort].getElementsByTagName('br')[0].remove()
                sortsDict[sort].getElementsByTagName('br')[0].remove()
            }
            if (i == 0) {
                sortsDict[sort].prepend(document.createElement('br'))
                sortsDict[sort].prepend(document.createElement('br'))
            }
            sortsDict[sort].parentNode.parentNode.parentNode.prepend(sortsDict[sort].parentNode.parentNode)
        }
    }
    document.getElementById('orderedListDivInner').innerHTML = ""
    addSorts()
}

async function doRandomGameButton() {
	if (await fetchSetting("randomGame")) {
		createRandomGameButton()
	}
}
doRandomGameButton()