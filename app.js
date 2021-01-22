require('dotenv').config();

const { MongoClient } = require('mongodb');
const { ObjectId } = require('mongodb').ObjectId;

const express = require('express');



const path = require('path');

const bodyParser = require("body-parser");

const app = express();

// Register EJS engine
app.set('view engine','ejs');
app.set('views','views');

const main = async () => {

	const uri = process.env.mongoURL;
	const client = new MongoClient(uri, {
		useUnifiedTopology: true,
		useNewUrlParser: true,
	});

	try {
		// Connect to the MongoDB cluster
		await client.connect();

		// Make the appropriate DB calls
		await init(client);

	} catch (e) {
		console.error(e);
	}
}

main().catch(console.err);


const init = async (client) => {

	app.use(express.static(path.join(__dirname, 'public')));

	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({ extended: true }));
	 
	//DB name
	const db = client.db('notesList')
	//Collection name
	const notes = db.collection('notes')

	//  Send data to calender event
	app.get('/calender-data', (req, res) => {
		notes.find().toArray((err, data) => {
			if(data.length > 0){
				res.send(data);
			}
		});
	});

	// Retrive all the note list
	app.get('/data', (req, res) => {
		notes.find().toArray((err, data) => {
			for (var i = 0; i < data.length; i++) {
				data[i].id = data[i]._id;
				delete data[i]["!nativeeditor_status"];
			}
			res.render('note', {
				"data":data
			});
		});
	});

	//post event
	app.post('/data', (req, res) => {
		var data = req.body;
		var mode = data["!nativeeditor_status"];
		var sid = data.id;
		var tid = sid;

		const update_response = (err) => {
			if (err)
				mode = "error";
			else if (mode == "inserted") {
				tid = data._id;
			}
			res.setHeader("Content-Type", "application/json");
			res.send({ action: mode, sid: sid, tid: String(tid) });
		}

		if (mode == "updated") {
			notes.updateOne({ "_id": ObjectId(tid) }, { $set: data }, update_response);
		} else if (mode == "inserted") {
			notes.insertOne(data, update_response);
		} else if (mode == "deleted") {
			notes.deleteOne({ "_id": ObjectId(tid) }, update_response)
		} else
			res.send("Not supported operation");
	});
};

//server port
app.listen(process.env.PORT, () => {
	console.log("Server is running on port " + process.env.PORT + "...");
});
