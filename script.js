'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
  type = '';
  date = new Date();
  id = (Date.now() + '').slice(-10);
  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // km
    this.duration = duration; // min
  }
}

class Running extends Workout {// prettier-ignore
  months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.name = `🏃‍♂️ Running on ${this.months[this.date.getMonth()]} ${this.date.getDate()}`
    this.calcPace();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {// prettier-ignore
  months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  constructor(coords, distance, duration, elevGain) {
    super(coords, distance, duration);
    this.elevGain = elevGain;
    this.name = `🚴‍♀️ Cycling on ${this.months[this.date.getMonth()]} ${this.date.getDate()}`
    this.calcSpeed();
  }

  calcSpeed() {
    // km/sec
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

//////////////////////////////////////////////////////////
class App {
  #map;
  #mapEvent;
  #workouts = [];
  #zoomLevel = 13;
  constructor() {
    this._getPosition();
    form.addEventListener('submit', this._newWorkOut.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopUp.bind(this));
    this._getFromLocalStorage();
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation?.getCurrentPosition(this._loadMap.bind(this), this._errorGetCurrentPosition);
    }
  }

  _errorGetCurrentPosition() {
    alert('Could not get your current position')
  }

  _loadMap(position) {
    const {latitude, longitude} = position?.coords;
    const coords = [latitude, longitude]
    this.#map = L.map('map').setView(coords, this.#zoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));
    this.#workouts.forEach(workout => this.renderMarkup(workout))
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }
  
  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }
  
  _moveToPopUp(e) {
    const workoutEle = e.target.closest('.workout');
    if (!workoutEle) return;

    const selectedWorkout = this.#workouts.find(work => work.id === workoutEle.dataset.id);
    this.#map.setView(selectedWorkout.coords, this.#zoomLevel, {
      animate: true,
      pan: {
        duration: 1
      }
    })
  }
  validateData(...inputs) {
    return inputs.every(input => Number.isFinite(input))
  }
  
  isPositiveNumbers(...inputs) {
    return inputs.every(input => input > 0)
  }

  _newWorkOut(e) {
    e.preventDefault();
    
    // Get all data
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const cadence = +inputCadence.value;
    const elevation = +inputElevation.value;
    const { lat, lng } = this.#mapEvent?.latlng;
    const coords = [lat, lng];
    let workout;
    
    // Create new Cycling Workout if Type is cycling
    if (type === 'cycling') {
      if (!this.validateData(distance, duration, elevation) || !this.isPositiveNumbers(distance, duration)) {
        return alert('Only Positive numbers are allowed!');
      }
      workout = new Cycling(coords, distance, duration, elevation);
    }
    // Create new Running Workout if Type is running
    if (type === 'running') {
      if (!this.validateData(distance, duration, cadence) || !this.isPositiveNumbers(distance, duration, cadence)) {
        return alert('Only Positive numbers are allowed!');
      }
      workout = new Running(coords, distance, duration, cadence);
    }
    // Push new workout in workout array
    workout.type = type;
    this.#workouts.unshift(workout);

    // Hide form
    this.hideForm();
    
    // Render Markup on Map
    this.renderMarkup(workout);

    // Render List
    this.renderList(workout);
    
    // save data to local Storage
    this.saveToLocalStorage(); 
    
  }

  hideForm() {
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => {
      form.style.display = 'grid';
    }, 200);
  }
  renderList(workout) {
    let html = '';
    const isCycling = workout.type === 'cycling';
      html += `<li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.name}</h2>
        <div class="workout__details">
          <span class="workout__icon">${isCycling ? '🚴‍♀️': '🏃‍♂️'}</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${isCycling ? workout.speed.toFixed(1): workout.pace.toFixed(1)}</span>
          <span class="workout__unit">${isCycling ? 'km/h': 'min/km'}</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">${isCycling ? '⛰': '🦶🏼'}</span>
          <span class="workout__value">${isCycling ? workout.elevGain: workout.cadence}</span>
          <span class="workout__unit">${isCycling ? 'm': 'spm'}</span>
        </div>`;
    form.insertAdjacentHTML('afterend', html);
  }

  renderMarkup(workout) {
    // clear out fields
    inputDistance.value = inputCadence.value = inputDuration.value = inputElevation.value = '';
    // show marker
    L.marker(workout.coords).addTo(this.#map)
      .bindPopup(L.popup({  
        maxWidth: 300,
        minWidth: 100,
        autoClose: false,
        closeOnClick: false,
        className: `${workout.type}-popup`
      }))
    .setPopupContent(workout.name)
    .openPopup();
  }
  
  saveToLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getFromLocalStorage() {
    const workouts = JSON.parse(localStorage.getItem('workouts'));
    this.#workouts = workouts;
    this.#workouts.forEach(workout => this.renderList(workout))
  }
}

const app = new App();


