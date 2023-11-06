const db = require('./database');
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');

const app = express();
const port = process.env.PORT || 6969;

db.connect((err) => {
    if (err) {
        console.log("Cannot connect to mysql server");
        return;
    }
    console.log("Connected to mysql server");
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set('view engine', 'ejs');
app.set('views', __dirname + '/public/html');

app.use(express.static(__dirname, + '/public/script.js'))
app.use("/public/css", express.static(__dirname + '/public/css/'));
app.use("/public/images", express.static(__dirname + '/public/images/'));

app.get('/', (req, res) => {
    console.log("Hello Home");
    res.render('index');
});

app.get('/login', (req, res) => {
    console.log("Hello login");
    res.sendFile(__dirname + '/public/html/login.html');
});

app.get('/registration', (req, res) => {
    console.log("Hello registration");
    res.sendFile(__dirname + '/public/html/registration.html');
});

const available = [];
var requestedCheckinDate = 'NULL';
var requestedCheckoutDate = 'NULL';
app.get('/room_availability', (req, res) => {
    console.log("Hello Room availability");

    requestedCheckinDate = req.query['checkin-date'];
    requestedCheckoutDate = req.query['checkout-date'];
    console.log("Requested Check in Date: " + requestedCheckinDate);
    console.log("Requested Check out Date: " + requestedCheckoutDate);

    const queryCount = 6;
    let completedQueries = 0;

    const handleQueryResult = (err, result) => {
        if (err) {
            console.error('Error fetching available room count: ', err);
        } else {
            const availableRoomCount = result[0].roomCount;
            available.push(availableRoomCount);
        }

        completedQueries++;

        if (completedQueries === queryCount) {
            console.log(available);
            res.render('room_availability', { available: available });
        }
    };

    const roomTypeIds = [1, 2, 3, 4, 5, 6];

    const queries = roomTypeIds.map((roomId) => {
        return `SELECT COUNT(*) AS roomCount FROM room WHERE room_type_id = ${roomId} AND 
        ((busy_from >= '${requestedCheckoutDate}' OR busy_upto <= '${requestedCheckinDate}') OR (is_available_now = 1 AND busy_from IS NULL AND busy_upto IS NULL))`;
    });

    queries.forEach((query) => {
        db.query(query, (err, results) => {
            handleQueryResult(err, results);
        });
    });
});

app.get('/book', (req, res) => {
    console.log("Hello book");
    res.render('book', { available: available });
    // res.render('book');
});

app.get('/apply_book', (req, res) => {
    console.log("Hello apply book");

    const firstName = req.query['first_name'];
    const lastName = req.query['last_name'];
    const passportNo = req.query['passport_no'];
    const nidNo = req.query['nid_no'];
    const occupation = req.query['occupation'];
    const age = req.query['age'];
    const email = req.query['email'];
    const mobile = req.query['contact_no'];
    var roomType = req.query['type_name'];
    const numberOfGuests = req.query['total_guests'];

    const sql = 'INSERT INTO guest (first_name, last_name, passport_no, nid_no, occupation, age, email, contact_no) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    const values = [firstName, lastName, passportNo, nidNo, occupation, age, email, mobile];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error inserting data into guest table: ' + err);
        } else {
            console.log('Data inserted successfully into the guest table: ');
        }
    });

    db.query(`SELECT guest_id FROM guest WHERE nid_no = ?`, [nidNo], (err, result) => {
        if (err) {
            console.log("Error getting nid no");
        } else {
            if (result.length > 0) {
                const guestId = result[0].guest_id;
                console.log('Guest ID: ', guestId);

                const sql2 = `INSERT INTO reservation (guest_id, check_in_date, check_out_date, total_guests, room_type_name) VALUES (?, ?, ?, ?, ?)`;
                const values2 = [guestId, requestedCheckinDate, requestedCheckoutDate, numberOfGuests, roomType];

                db.query(sql2, values2, (err, result) => {
                    if (err) {
                        console.error('Error inserting data into reservation table: ' + err);
                    } else {
                        console.log('Data inserted successfully into the reservation table');
                        res.render('apply_success');
                    }
                });

            } else {
                console.log("No result found fot the given nid_no");
            }
        }
    });

    // console.log(req.query);
});


app.listen(port, () => {
    console.log(`Listening to port ${port}`);
});