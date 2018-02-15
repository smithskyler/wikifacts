$(document).ready(function() {
	
	$("#factSubmit").click(function(event) {
		event.preventDefault();
		var subject = $("#factSubject").val();
//		console.log(subject);
		
		var wikiSearchURL = "https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=" + encodeURIComponent(subject) + "&utf8=&format=json";
//		console.log(wikiSearchURL);
		$.ajax({
			url: wikiSearchURL,
			dataType: "jsonp",
			success: function(json) {
//				console.log(json);
				// Find the first result with more than 1000 words.
				var selectedPageTitle = json.query.search.filter(function(page) {
					return page.wordcount > 1000;
				})[0].title;
				if (selectedPageTitle == undefined) {
					console.log("Not Found");
					return;
				}
//				console.log("Page Title: " + selectedPageTitle);
				// Use the page title to find the associated article on wikipedia
				var wikiQueryURL = "https://en.wikipedia.org/w/api.php?action=query&titles=" + encodeURIComponent(selectedPageTitle) + "&prop=revisions&rvprop=content&format=json&formatversion=2"
//				console.log("Search: " + wikiQueryURL);
				
				$.ajax({
					url: wikiQueryURL,
					dataType: "jsonp",
					success: function(json) {
						console.log(json);
						// Grab the page content
						var content = json.query.pages[0].revisions[0].content.toLowerCase();
//						console.log(content);
						
						// Find the proposition words in the content
						var proposition = $("#factProposition").val();
//						console.log("Your Proposition: " + proposition);
						if (proposition.length < 2) {
							$("#factSearchResult").html("<h2>Your fact is too short.</h2>");
						}
						var propWords = proposition.toLowerCase().replace(/[^0-9a-z ]/gi, '').split(/[ ]+/).filter(function(word) {
							return word.length > 0 && [" ", "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "he", "in", "is", "isnt", "it", "its", "not", "of", "on", "that", "the", "to", "was", "wasnt", "were", "will", "with", "she"].indexOf(word) == -1;
						});
//						console.log("PropWords: " + propWords);
						if (propWords.length < 1) {
							return;
						}
						
						//Separate the document into 200-character sections that overlap halfway. Score the sections based on occurrences of the proposition words in those sections.
						const sectionLength = 200;
						const sectionOffset = sectionLength / 2;
						const numSections = Math.ceil(content.length / sectionOffset);
						var sectionScores = Array(numSections).fill(0);
						// Returns the sections that an index is included in
						function sectionsOf(index) {
							let area = (index / sectionOffset) - 1;
							let first = Math.floor(area);
							let second = Math.ceil(area);
							if (first !== second) {
								return [first, second];
							} else {
								return [first]
							}
						}
						propWords.forEach(function(word) {
							var startIndex = 0;
							var index;
							var wordLength = word.length;
							var sectionsCounted = [];
							while ((index = content.indexOf(word, startIndex)) > -1) {
								sectionsOf(index).filter(function(a) {
									return sectionsCounted.indexOf(a) == -1;
								}).forEach(function(i) {
									function isNum(text) {
										return (text - 0) == text && (''+text).trim().length > 0;
									}
									if (!(isNum(word) && (isNum(content[index-1]) || isNum(content[index+1])))) {
										sectionScores[i] = sectionScores[i] + 1;
										sectionsCounted.push(i);
									}
								});
								startIndex = index + wordLength;
							}
						});
//						console.log(sectionScores);
						// Take the section with the highest score
						var matchSection = sectionScores.reduce((iMax, x, i, arr) => x > arr[iMax] ? i : iMax, 0);
						
//						console.log(matchSection);
//						console.log(sectionScores[matchSection]);
						let beginIndex = matchSection * sectionOffset;
						let endIndex = beginIndex + sectionLength;
						let sectionContent = content.substring(beginIndex, endIndex);
						// Check if 80% of the propositions occur in this section.
						var propsContained = 0;
						propWords.forEach(function(word) {
							if (sectionContent.indexOf(word) > -1) {
								propsContained++;
							}
						});
						var html;
						html = "<h2>WikiWilly says:</h2>"
						if ((propsContained / propWords.length) >= 0.80) {
							html += "<h2>Fact!</h2>"
						} else {
							html += "<h2>False!</h2>"
						}
						html += "<p>..." + sectionContent + "...</p>"
						html += "<p><a href=https://en.wikipedia.org/wiki/" + encodeURIComponent(selectedPageTitle) + ">Wikipedia</a></p>"
						
						$("#factSearchResult").html(html);
					}
				});
			}
		});
	});
});