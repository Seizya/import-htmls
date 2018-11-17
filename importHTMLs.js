/*
Make sure that this script is loaded earlier than any script.

This script add an import tag.
For example, <import src="./button.html" /> will be replaced with the contents of ./button.html.
By the way, by default, the import tag is replaced only when the page is read for the first time.
(Exception: the import tag written in the file imported by the import tag will be replaced)
If you want to interpret the import tag at other times, please call the importHTMLs function without arguments.

The load event handler added between the time that this script is loaded and the window load event fires is called after importHTMLs is executed.

The <script src = "..."> written in the imported file is interpreted by the browser and the script to be loaded by that script tag will be loaded.
*/
(() => {
	var listeners = [];
	const tmp = window.addEventListener;
	window.addEventListener("load", (...args) => {
		importHTMLs().then(() => {
			listeners.forEach(_ => _[0](...args));
			listeners.forEach(_ => tmp("load", ...args));
			listeners = [];
		});
		window.addEventListener = tmp;
	});
	window.addEventListener = (type, ...args) => {
		if (type == "load") listeners.push(args);
		else tmp(type, ...args);
	}
})();
function importHTMLs() {
	const warn = (..._) => console.warn("[importHTMLs] ", ..._);
	return Promise.all(Array.from(document.getElementsByTagName("import")).map(importElem => {
		// This function returns whether the importHTMLs function needs to be recalled to read the newly added import tag.
		const path = importElem.getAttribute("src");
		if (!path) {
			warn("There was an import tag for which src does not specify the file path you want to load. I ignored it.");
			return false; // It is not necessary to re-call importHTMLs
		}
		return fetch(path)
			.then(res => res.text())
			.then(text => {
				let shouldRecall = false; // Whether it is needed to recall importHTMLs
				let tmp = document.createElement("div");
				tmp.innerHTML = text;
				(function replaceScriptTag(elem) {
					elem.childNodes.forEach((child, index) => {
						if (child.tagName == "IMPORT") {
							shouldRecall = true;
						} else if (child.tagName == "SCRIPT") {
							let newElem = document.createElement("script");
							for (let i = 0; i < child.attributes.length; i++) {
								var attr = child.attributes.item(i);
								newElem.setAttribute(attr.nodeName, attr.nodeValue);
							}
							newElem.innerHTML = child.innerHTML;
							elem.replaceChild(newElem, child);
						} else {
							replaceScriptTag(child);
						}
					});
					return elem;
				})(tmp);
				tmp.childNodes.forEach(_ => importElem.parentElement.insertBefore(_, importElem));
				importElem.parentElement.removeChild(importElem);
				return shouldRecall;
			})
			.catch(err => warn(path + " の読み込みでエラーが起きました。詳細は……", err));
	})).then(shouldRecall => {
		if (shouldRecall.some(_ => _))
			return importHTMLs();
	});
}