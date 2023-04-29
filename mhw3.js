const AMADEUS_ENDPOINT = "https://test.api.amadeus.com"

// RECOMMEND HEADER FROM DOC
const HEADERS = {
    "Content-Type": "application/x-www-form-urlencoded",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive"
}
const client_id = "rbdKT4s9iUY9PoGJoXtAecow3S5nj9rm";
const client_secret = "ZJpTzCN60eZciGHo";

let token_data = null;
// HTML RESULT BACKUP
const OFFERT_BACKUP = document.querySelector('#flight-offert-1').cloneNode(true);

/*
AMADEUS ENDPOINT: https://developers.amadeus.com
DOC AT: https://developers.amadeus.com/self-service/apis-docs
*/
function init(none){
  fetch(AMADEUS_ENDPOINT + "/v1/security/oauth2/token", {
    method: "post",
    body: `grant_type=client_credentials&client_id=${client_id}&client_secret=${client_secret}`,
    headers: HEADERS,
  }).then(onResponse).then(onJsonToken);
  
}
function onResponse(response){
    return response.json();
}
function onJsonToken(json){

    if(json["error"]){
        console.error("ERROR: " + json["error_description"]);
        return;
    }
    
    token_data = json;
    HEADERS.Authorization = token_data.token_type + ' ' + token_data.access_token;
}
async function searchFlight(event) {
    event.preventDefault(); // prevent default activity of the submit button
    let flight_origin_value = encodeURIComponent(document.querySelector("#flight-origin").value);
    let flight_destination_value = encodeURIComponent(document.querySelector("#flight-destination").value);
    const flight_adults_value = encodeURIComponent(document.querySelector("#flight-adults").value);
    const flight_departure_date_value = convertDateIfNull(encodeURIComponent(document.querySelector("#flight-departure-date").value));
    const flight_return_date_value = convertDateIfNull(encodeURIComponent(document.querySelector("#flight-return-date").value), 2);

    // the combination of await and async allows you to write asynchronous code in a more readable and synchronous style 
    if(flight_origin_value.length > 3){
        const result = await onCitySearch(flight_origin_value);
        flight_origin_value = result;
        console.log(flight_origin_value);
    }
    if(flight_destination_value.length > 3){
        const result = await onCitySearch(flight_destination_value);
        flight_destination_value = result;
    }

    onFlightOffert(flight_origin_value, flight_destination_value, flight_departure_date_value, flight_return_date_value, flight_adults_value, 1);
}
function onFlightOffert(originLocationCode, destinationLocationCode, departureDate, returnDate, adults, max=1){ 
    if(token_data == null){
        console.error("TOKEN_DATA IS NULL");
        return;
    }

    document.querySelector('#loading-cotainer').style.display = 'block'; // DISPLAY LOADING CONTAINER
    document.querySelector('#flight-offert').style.display = 'none'; // HIDE OFFERT CONTAINER

    const parametersQuery = `originLocationCode=${originLocationCode}&destinationLocationCode=${destinationLocationCode}&departureDate=${departureDate}&returnDate=${returnDate}&adults=${adults}&max=${max}`

    fetch(AMADEUS_ENDPOINT + "/v2/shopping/flight-offers?" + parametersQuery, {
        method: "get",
        headers: HEADERS,
    }).then(onResponse).then(onJsonFlightOffert);
}
function onCitySearch(cityName) {
    return fetch(`https://api.skypicker.com/locations?term=${cityName}&location_types=airport&active_only=true&limit=1`)
      .then(onResponse)
      .then(json => {
        console.log(json);
        if (json.locations.length > 0) {
          return json.locations[0].id;
        }
        return "ROM";
      });
}
function convertDateIfNull(dateString, addDays = 1) {
    if (!dateString) {
      let today = new Date();
      today.setDate(today.getDate() + addDays);
      return today.toISOString().slice(0, 10);
    }
    return dateString;
}
function formatDuration(duration) {
    const hoursIndex = duration.indexOf('H');
    const minutesIndex = duration.indexOf('M');
    const hours = hoursIndex > 0 ? parseInt(duration.substring(2, hoursIndex)) : 0;
    const minutes = minutesIndex > 0 ? parseInt(duration.substring(hoursIndex + 1, minutesIndex)) : 0;

    const result = `${hours} ore e ${minutes} minuti`;
  
    return result;
}
function formatDateAndTime(dateTimeString) {
    
    const dateObj = new Date(dateTimeString);
  
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    const date = dateObj.toLocaleDateString('it-IT', options);
  
    const time = dateObj.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  
    return {
      date: date,
      time: time
    };
}
function onJsonFlightOffert(json){

    let data = json["data"];
    let data_extracted = [] // debug purpose

    for(var i = 0; i < data.length; i++){
        let offert = {};
        let data_offert = data[i];
        offert.number = i+1;
        offert.price = data_offert.price.base;
        offert.currency = data_offert.price.currency;
        offert.airline = json.dictionaries.carriers[data_offert.validatingAirlineCodes[0]]
        // just info for itinerary 1
        offert.originLocationAirport = data_offert.itineraries[0].segments[0].departure.iataCode;
        offert.destinationLocationAirport = data_offert.itineraries[0].segments[data_offert.itineraries[0].segments.length - 1].arrival.iataCode;
        offert.originTime = formatDateAndTime(data_offert.itineraries[0].segments[0].departure.at).time;
        offert.destinationTime = formatDateAndTime(data_offert.itineraries[0].segments[data_offert.itineraries[0].segments.length - 1].arrival.at).time;
        offert.duration = formatDuration(data_offert.itineraries[0].duration);
        offert.stopovers = data_offert.itineraries[0].segments.length - 1;
        // segments resume itinerary 1
        let offert_segments = [];
        for(var j = 0; j < data_offert.itineraries[0].segments.length; j++){
            let segment = data_offert.itineraries[0].segments[j];
            
            offert_segments[j] = {
                departure_date_time: formatDateAndTime(segment.departure.at),
                departure_terminal: segment.departure.terminal,
                departure_airport: segment.departure.iataCode,
                airplane_company: json.dictionaries.carriers[segment.carrierCode],
                airplane_model: json.dictionaries.aircraft[segment.aircraft.code],
                duration: formatDuration(segment.duration),
                arrival_date_time: formatDateAndTime(segment.arrival.at),
                arrival_airport: segment.arrival.iataCode,
            } 
        }
        offert.segments = offert_segments;
        
        data_extracted.push(offert);
    }

    // html settings
    // just for 1 offert
    if(data_extracted.length > 0){
        document.querySelector('#flight-offert-1').remove();
        const offert_doc = OFFERT_BACKUP.cloneNode(true);
        document.querySelector('#flight-offert').appendChild(offert_doc);
        offert_doc.querySelector('.id-offer').textContent = data_extracted[0].number;
        offert_doc.querySelector('.price').textContent = data_extracted[0].price;
        offert_doc.querySelector('.price-currency').textContent = data_extracted[0].currency;
        offert_doc.querySelector('.flight-offert-info-company').textContent = data_extracted[0].airline;

        offert_doc.querySelector('.flight-duration').textContent = data_extracted[0].duration;
        offert_doc.querySelector('.flight-stopovers').textContent = "(" + data_extracted[0].stopovers + "scali)";

        offert_doc.querySelector('.flight-start-airport').textContent = data_extracted[0].originLocationAirport;
        offert_doc.querySelector('.flight-end-airport').textContent = data_extracted[0].destinationLocationAirport;
        offert_doc.querySelector('.flight-start-hour').textContent = data_extracted[0].originTime;
        offert_doc.querySelector('.flight-end-hour').textContent = data_extracted[0].destinationTime;

        const planes = offert_doc.querySelector('.planes');
        const plane_stopovers_img = planes.querySelector('img');
        for(var i = 0; i < parseInt(data_extracted[0].stopovers); i++){
            const image = document.createElement('img');
            image.src = plane_stopovers_img.src;

            planes.appendChild(image);
        }
        // add segment
        const segment = offert_doc.querySelector('.segment');
        const s = offert_doc.querySelector('.segments');
        for(var i = 0; i < data_extracted[0].segments.length - 1; i++){
            const clone = segment.cloneNode(true);
            s.appendChild(clone);
        }
        // fill segment
        const segments = offert_doc.querySelectorAll('.segment');
        for(var i = 0; i < data_extracted[0].segments.length; i++){
            const seg = segments[i];
            const seg_data = data_extracted[0].segments[i];
            seg.querySelector('.info-segment .title .at').textContent = seg_data.departure_date_time.date;
            
            const departure = seg.querySelector('.departure');
            departure.querySelector('.hour').textContent = seg_data.departure_date_time.time;
            departure.querySelector('.terminal').textContent = seg_data.departure_terminal;
            departure.querySelector('.airport').textContent = seg_data.departure_airport;

            const arrival = seg.querySelector('.arrival');
            arrival.querySelector('.hour').textContent = seg_data.arrival_date_time.time;
            arrival.querySelector('.airport').textContent = seg_data.arrival_airport;

            seg.querySelector('.carrier_code').textContent = seg_data.airplane_company;
            seg.querySelector('.aircraft').textContent = seg_data.airplane_model;
            seg.querySelector('.duration').textContent = seg_data.duration;
        }
        document.querySelector('#loading-cotainer').style.display = 'none'; // HIDE LOADING CONTAINER
        document.querySelector('#flight-offert').style.display = 'block'; // SHOW OFFERT CONTAINER
    }
}

init();

const formFlight = document.querySelector('#flight-form');
formFlight.addEventListener('submit', searchFlight);