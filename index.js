const express = require("express")
const bodyparser = require("body-parser")
const cheerio = require("cheerio")
const request = require("request")
const moment = require("moment")

const url = "http://ctftime.org/event/list/upcoming"

let ctfs = []
let resolveTime = null

const greeting  = ["Hello", "Hi there", "Hey"]
const operation = ["I found that", "it seems", "it looks like"]
const remoteFormat = "YYYY-MM-DD"

let getData = function() {
	console.log('Requesting CTFTime data')
	request(url, (err, _, body) => {
		resolveTime = Date.now()
		if (err) {
			console.log(err)
			return
		}
		console.log("Data received")
		$ = cheerio.load(body)
		let entries = $(".table tr").toArray()
		let localCtfs = []
		for (let el of entries) {
			let data = $(el).find("td").toArray()
			let [name, time, ..._] = data.map((e) => $(e).text())
			
			if (time != undefined) {
				let [start, end] = time.split(" — ")
				console.log(start, end)
				// Fri, 16 Dec. 2016, 14:30 UTC
				const format = "ddd, DD MMM. YYYY, HH:mm zz"
				localCtfs.push([name, moment(start, format), moment(end, format)])
			}
		}
		localCtfs.sort(([n1, start1, end1], [n2, start2, end2]) => {
			return start1 < start2 ? -1 : 1 
		})
		ctfs = localCtfs
	})
}

let format = (time) =>
	time.format("dddd, MMMM Do")

let formatShort = (time) =>
	time.format("MMMM Do")

let get = (arr) =>
	arr[Math.floor(Math.random() * arr.length)]

let clean = (elt) =>
	elt.split(/[ \t\n]+/)
	   .filter((t) => !t || isNaN(+t) || t.toLowerCase() in ['competition'])
	   .join(" ")

let length = function(start, end) {
	return end.from(start, true)
}

let interleave = function(first, second) {
	let out = ''
	for (let i = 0; i < first.length; i++) {
		out += first[i] + second[i]
	}
	out += first[first.length - 1]
	return out
}

getData()

app = express()
app.use(bodyparser.json())

app.post('/', (req, res) => {

	let time = req.body.result.parameters['date']
	let timeRange = req.body.result.parameters['date-period']

	let cStart = null
	let cEnd = null
	let ctfList = []

	if (time) {
		cStart = moment(time, remoteFormat)
		cEnd = moment(time, remoteFormat)
		cStart.subtract(24, 'hours')
		cEnd.add(24, 'hours')
	} else if (timeRange) {
		let [start, end] = timeRange.split("/")
		cStart = moment(start, remoteFormat)
		cEnd = moment(end, remoteFormat)
	}

	if (!cStart || !cEnd || !cStart.isValid() || !cEnd.isValid()) {
		ctfList = [ctfs[0]]
	} else {
		for (let i in ctfs) {
			let [name, start, end] = ctfs[i]
			//console.log(`Searching for (${start}, ${end}) (${cStart}, ${cEnd})`)
			if ((cStart < start && start < cEnd) || (start < cStart && cStart < end)) {
				ctfList.push(ctfs[i])
			}
		}
	}

	let text;
	if (ctfList.length > 1) {
		let list = ""
		let [last] = ctfList.splice(-1)
		for (let [name, start, _] of ctfList) {
			list += `${clean(name)} is on ${formatShort(start)}, `
		}
		let [name, start, _] = last 
		list += `and ${clean(name)} is on ${formatShort(start)}`
		text = `${get(greeting)}, ${get(operation)} ${list}`
	} else if (ctfList.length == 1) {
		let ctf = ctfList[0]
		text = `${get(greeting)}, ${get(operation)} ${clean(ctf[0])} starts on ${format(ctf[1])} and lasts for ${length(ctf[1], ctf[2])}`
	} else {
		text = `I'm sorry, I can't find any CTFs then.` 
	}
	res.send({
		speech: text,
		displayText: text,
		source: "CTFTime",
	})
	return
})

app.listen(1338, () => {
	console.log('Listening')	
})
