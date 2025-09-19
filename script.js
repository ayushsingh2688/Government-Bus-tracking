// --- 1. PREDEFINED BUS ROUTE DATA ---
const initialBusRoutes = [
    { id: "PRTC-01", name: "Amritsar to Chandigarh", stops: ["amritsar", "jalandhar", "ludhiana", "chandigarh"] },
    { id: "PUNBUS-02", name: "Jalandhar to Delhi", stops: ["jalandhar", "ludhiana", "ambala", "delhi"] },
    { id: "PRTC-03", name: "Ludhiana to Bathinda", stops: ["ludhiana", "moga", "bathinda"] },
    { id: "PUNBUS-04", name: "Patiala to Amritsar", stops: ["patiala", "ludhiana", "jalandhar", "amritsar"] },
    { id: "PRTC-05", name: "Pathankot to Amritsar", stops: ["pathankot", "gurdaspur", "batala", "amritsar"] }
];
const reverseRoutes = initialBusRoutes.map(route => {
    const reversedStops = [...route.stops].reverse();
    const name = `${reversedStops[0].charAt(0).toUpperCase() + reversedStops[0].slice(1)} to ${reversedStops[reversedStops.length - 1].charAt(0).toUpperCase() + reversedStops[reversedStops.length - 1].slice(1)}`;
    return { id: `${route.id}-R`, name: name, stops: reversedStops };
});
const busRoutes = [...initialBusRoutes, ...reverseRoutes];
const allCities = [...new Set(busRoutes.flatMap(route => route.stops))];

// --- 2. APP STATE ---
let recentSearches = [];
let quickStops = [];
let currentSearch = {}; // Will hold the latest search for the modal {type, ...}

document.addEventListener('DOMContentLoaded', () => {

    // --- 3. DOM ELEMENT REFERENCES ---
    const screens = document.querySelectorAll('.screen-container');
    const navItems = document.querySelectorAll('.nav-item');
    const crowdOptions = document.querySelectorAll('.crowd-option');
    const swapButton = document.getElementById('swap-locations-btn');
    const startLocationInput = document.getElementById('start-location');
    const endLocationInput = document.getElementById('end-location');
    const busNumberInput = document.getElementById('bus-number');
    const startSuggestions = document.getElementById('start-suggestions');
    const endSuggestions = document.getElementById('end-suggestions');
    const startError = document.getElementById('start-error');
    const endError = document.getElementById('end-error');
    const searchButton = document.getElementById('search-btn');
    const etaResultsContainer = document.getElementById('eta-results-container');
    const quickStopsContainer = document.getElementById('quick-stops-container');
    const recentSearchesContainer = document.getElementById('recent-searches-container');
    const quickStopModalOverlay = document.getElementById('quick-stop-modal-overlay');
    const modalTitle = quickStopModalOverlay.querySelector('h2');
    const modalDescription = quickStopModalOverlay.querySelector('p');
    const saveWorkBtn = document.getElementById('save-work-btn');
    const saveHomeBtn = document.getElementById('save-home-btn');
    const saveOtherBtn = document.getElementById('save-other-btn');
    const mapTitle = document.getElementById('map-title');
    const mapRouteTimeline = document.getElementById('map-route-timeline');
    const submitCrowdBtn = document.getElementById('submit-crowd-report-btn');

    // --- 4. CORE APP LOGIC & UI RENDERING ---
    window.showScreen = (screenId) => {
        screens.forEach(screen => screen.classList.remove('active'));
        const activeScreen = document.getElementById(screenId);
        if (activeScreen) activeScreen.classList.add('active');
        updateActiveNav(screenId);
    };
    
    const updateActiveNav = (screenId) => {
        navItems.forEach(item => item.classList.remove('active'));
        const navId = screenId.split('-')[0] + '-nav';
        const activeNavItem = document.getElementById(navId);
        if (activeNavItem) activeNavItem.classList.add('active');
    };

    const performSearch = () => {
        const busNumberQuery = busNumberInput.value.trim().toLowerCase();
        const source = startLocationInput.value.trim().toLowerCase();
        const destination = endLocationInput.value.trim().toLowerCase();

        if (busNumberQuery) {
            currentSearch = { type: 'bus', number: busNumberQuery };
            const foundBus = busRoutes.find(route => route.id.toLowerCase() === busNumberQuery);
            if (foundBus) {
                currentSearch.name = foundBus.name;
                addRecentSearch(currentSearch);
                const isAlreadyQuickStop = quickStops.some(stop => stop.type === 'bus' && stop.number === busNumberQuery);
                if (!isAlreadyQuickStop) {
                    setTimeout(() => showQuickStopModal(), 800);
                }
            }
            displayBusResults(foundBus ? [foundBus] : [], {});
            showScreen('eta-screen');
            busNumberInput.value = '';
            return;
        }

        validateInput(startLocationInput, startError);
        validateInput(endLocationInput, endError);
        const isErrorVisible = !startError.classList.contains('hidden') || !endError.classList.contains('hidden');

        if (isErrorVisible) {
             alert("Please enter a correct source or destination.");
             return;
        }
        if (!source || !destination) {
            alert("Please enter both source and destination.");
            return;
        }
        if (source === destination) {
            alert("Source and destination cannot be the same.");
            return;
        }

        const foundBuses = busRoutes.filter(route => {
            const sourceIndex = route.stops.indexOf(source);
            const destIndex = route.stops.indexOf(destination);
            return sourceIndex !== -1 && destIndex !== -1 && sourceIndex < destIndex;
        });
        
        currentSearch = { type: 'route', source, destination };
        if (foundBuses.length > 0) {
            addRecentSearch(currentSearch);
            const isAlreadyQuickStop = quickStops.some(stop => stop.type === 'route' && stop.source === source && stop.destination === destination);
            if (!isAlreadyQuickStop) {
                setTimeout(() => showQuickStopModal(), 800);
            }
        }

        displayBusResults(foundBuses, { source, destination });
        showScreen('eta-screen');
    };

    const displayBusResults = (buses, searchParams = {}) => {
        etaResultsContainer.innerHTML = '';
        etaResultsContainer.className = 'bg-gray-100 p-2 rounded-xl space-y-3';
    
        if (buses.length === 0) {
            etaResultsContainer.innerHTML = `<div class="p-4 text-center text-gray-600">No bus found. Please check your input and try again.</div>`;
            return;
        }

        buses.forEach(bus => {
            const eta = Math.floor(Math.random() * 45) + 10;
            const stopsHTML = bus.stops.map((stop, index) => {
                const isSourceOrDest = stop === searchParams.source || stop === searchParams.destination;
                const highlightClass = isSourceOrDest ? 'font-bold text-indigo-600' : 'text-gray-600';
                
                let iconHTML;
                if (index === 0) {
                    iconHTML = `<div class="timeline-icon"><div class="timeline-line"></div><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>`;
                } else if (index === bus.stops.length - 1) {
                    iconHTML = `<div class="timeline-icon"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-red-500" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" /></svg></div>`;
                } else {
                    iconHTML = `<div class="timeline-icon"><div class="timeline-line"></div><div class="w-2.5 h-2.5 bg-gray-300 rounded-full border-2 border-white"></div></div>`;
                }

                return `<li class="timeline-item"><div class="mr-3">${iconHTML}</div><span class="capitalize ${highlightClass}">${stop}</span></li>`;
            }).join('');

            const busResultHTML = `
                <div class="bus-ticket bus-result-item rounded-xl shadow-sm p-4 cursor-pointer" data-bus-id="${bus.id}">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="font-bold text-lg text-indigo-700">${bus.id}</p>
                            <p class="text-sm text-gray-700 font-medium">${bus.name}</p>
                        </div>
                        <div class="text-right flex-shrink-0 ml-4">
                            <p class="font-black text-xl text-green-600">${eta}</p>
                            <p class="text-xs text-gray-500 -mt-1">MINS</p>
                        </div>
                    </div>
                    <div class="border-t-2 border-dashed border-gray-200 my-3"></div>
                    <div>
                        <ul class="space-y-1">${stopsHTML}</ul>
                    </div>
                </div>`;
            etaResultsContainer.innerHTML += busResultHTML;
        });

        document.querySelectorAll('.bus-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const busId = item.dataset.busId;
                const selectedBus = busRoutes.find(bus => bus.id === busId);
                if (selectedBus) {
                    updateMapUI(selectedBus);
                    showScreen('live-map-screen');
                }
            });
        });
    };

    const updateMapUI = (bus) => {
        mapTitle.textContent = `Live Map: Bus ${bus.id}`;
        mapRouteTimeline.innerHTML = '';
        mapRouteTimeline.className = 'bg-gray-100 p-4 rounded-xl space-y-1';

        const userSource = currentSearch.type === 'route' ? currentSearch.source : null;
        const userDestination = currentSearch.type === 'route' ? currentSearch.destination : null;

        const stopsHTML = bus.stops.map((stop, index) => {
            const isUserSource = stop === userSource;
            const isUserDestination = stop === userDestination;

            let highlightClass = 'text-gray-700';
            let label = '';

            if (isUserSource) {
                highlightClass = 'font-bold text-green-600';
                label = ` <span class="text-xs font-normal text-green-600">(Your Start)</span>`;
            } else if (isUserDestination) {
                highlightClass = 'font-bold text-red-600';
                label = ` <span class="text-xs font-normal text-red-600">(Your Stop)</span>`;
            }

            let iconHTML;
            if (index === 0) {
                iconHTML = `<div class="timeline-icon"><div class="timeline-line"></div><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>`;
            } else if (index === bus.stops.length - 1) {
                iconHTML = `<div class="timeline-icon"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-red-500" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" /></svg></div>`;
            } else {
                iconHTML = `<div class="timeline-icon"><div class="timeline-line"></div><div class="w-2.5 h-2.5 bg-gray-300 rounded-full border-2 border-white"></div></div>`;
            }

            return `<li class="timeline-item"><div class="mr-3">${iconHTML}</div><span class="capitalize ${highlightClass}">${stop}${label}</span></li>`;
        }).join('');

        mapRouteTimeline.innerHTML = `<ul class="space-y-1">${stopsHTML}</ul>`;
    };
    
    // --- 5. MODAL LOGIC ---
    const showQuickStopModal = () => {
        if (currentSearch.type === 'route') {
            modalTitle.textContent = 'Save Route to Quick Stops?';
            modalDescription.textContent = 'Label this route for easy one-tap access later.';
            saveWorkBtn.textContent = 'Save as Work';
            saveHomeBtn.textContent = 'Save as Home';
            saveHomeBtn.classList.remove('hidden');
        } else if (currentSearch.type === 'bus') {
            modalTitle.textContent = 'Save Bus to Quick Stops?';
            modalDescription.textContent = `Save Bus ${currentSearch.number.toUpperCase()} for easy access.`;
            saveWorkBtn.textContent = 'Save Bus';
            saveHomeBtn.classList.add('hidden');
        }
        quickStopModalOverlay.classList.remove('hidden');
    };
    const hideQuickStopModal = () => quickStopModalOverlay.classList.add('hidden');

    const addQuickStop = (purpose) => {
        const newStop = { purpose, ...currentSearch };
        
        if (newStop.type === 'bus') {
            quickStops = quickStops.filter(stop => !(stop.type === 'bus' && stop.number === newStop.number));
        } else if (newStop.type === 'route') {
            quickStops = quickStops.filter(stop => !(stop.purpose === purpose));
        }

        quickStops.unshift(newStop);
        if (quickStops.length > 3) quickStops.pop();
        updateQuickStopsUI();
        hideQuickStopModal();
    };
    
    // --- 6. DYNAMIC UI & VALIDATION ---
    const validateInput = (inputEl, errorEl) => {
        const city = inputEl.value.trim().toLowerCase();
        if (city && !allCities.includes(city)) {
            errorEl.classList.remove('hidden');
        } else {
            errorEl.classList.add('hidden');
        }
    };

    const setupAutocomplete = (inputEl, suggestionEl) => {
        inputEl.addEventListener('input', () => {
            validateInput(inputEl, inputEl === startLocationInput ? startError : endError);
            const query = inputEl.value.toLowerCase();
            suggestionEl.innerHTML = '';
            if (query) {
                const filteredCities = allCities.filter(city => city.startsWith(query)).slice(0, 5);
                if (filteredCities.length > 0) {
                    suggestionEl.style.display = 'block';
                    filteredCities.forEach(city => {
                        const item = document.createElement('div');
                        item.classList.add('suggestion-item');
                        item.textContent = city.charAt(0).toUpperCase() + city.slice(1);
                        item.addEventListener('click', () => {
                            inputEl.value = item.textContent;
                            suggestionEl.style.display = 'none';
                            validateInput(inputEl, inputEl === startLocationInput ? startError : endError);
                        });
                        suggestionEl.appendChild(item);
                    });
                } else {
                    suggestionEl.style.display = 'none';
                }
            } else {
                suggestionEl.style.display = 'none';
            }
        });
    };
    
    const addRecentSearch = (searchItem) => {
        if (searchItem.type === 'bus') {
            recentSearches = recentSearches.filter(item => !(item.type === 'bus' && item.number === searchItem.number));
        } else if (searchItem.type === 'route') {
            recentSearches = recentSearches.filter(item => !(item.type === 'route' && item.source === searchItem.source && item.destination === searchItem.destination));
        }
        
        recentSearches.unshift(searchItem);
        if (recentSearches.length > 3) recentSearches.pop();
        updateRecentSearchesUI();
    };

    const updateRecentSearchesUI = () => {
        recentSearchesContainer.innerHTML = '';
        if (recentSearches.length === 0) {
            recentSearchesContainer.innerHTML = `<div class="bg-gray-200 p-4 rounded-xl text-sm text-center text-gray-500">Your recent searches will appear here.</div>`;
            return;
        }

        recentSearches.forEach(search => {
            let searchCard = '';
            if (search.type === 'route') {
                searchCard = `
                    <div class="recent-search-item bg-white p-3 rounded-xl shadow-sm flex items-center justify-between" data-type="route" data-source="${search.source}" data-destination="${search.destination}">
                        <div class="flex items-center">
                            <span class="bg-yellow-200 text-yellow-700 p-2 rounded-full mr-3">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v6h-2.25a.75.75 0 0 0 0 1.5h3a.75.75 0 0 0 .75-.75V6a.75.75 0 0 0-.75-.75Z" clip-rule="evenodd" /></svg>
                            </span>
                            <div>
                                <div class="font-medium capitalize">${search.source}</div>
                                <div class="text-sm text-gray-500 capitalize">${search.destination}</div>
                            </div>
                        </div>
                        <div><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 text-gray-400"><path fill-rule="evenodd" d="M12.97 3.97a.75.75 0 0 1 1.06 0l7.5 7.5a.75.75 0 0 1 0 1.06l-7.5 7.5a.75.75 0 1 1-1.06-1.06l6.22-6.22H3a.75.75 0 0 1 0-1.5h16.19l-6.22-6.22a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg></div>
                    </div>`;
            } else if (search.type === 'bus') {
                searchCard = `
                    <div class="recent-search-item bg-white p-3 rounded-xl shadow-sm flex items-center justify-between" data-type="bus" data-number="${search.number}">
                        <div class="flex items-center">
                            <span class="bg-gray-200 text-gray-700 p-2 rounded-full mr-3">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"><path d="M3.375 3C2.339 3 1.5 3.84 1.5 4.875v.75c0 1.036.84 1.875 1.875 1.875h17.25c1.035 0 1.875-.84 1.875-1.875v-.75C22.5 3.839 21.66 3 20.625 3H3.375Z" /><path fill-rule="evenodd" d="M3.087 9l.54 9.176A3 3 0 0 0 6.62 21h10.757a3 3 0 0 0 2.995-2.824L20.913 9H3.087ZM12 10.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5a.75.75 0 0 1 .75-.75Z" clip-rule="evenodd" /></svg>
                            </span>
                            <div>
                                <div class="font-medium">Bus Number</div>
                                <div class="text-sm text-gray-500 uppercase">${search.number}</div>
                            </div>
                        </div>
                        <div><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 text-gray-400"><path fill-rule="evenodd" d="M12.97 3.97a.75.75 0 0 1 1.06 0l7.5 7.5a.75.75 0 0 1 0 1.06l-7.5 7.5a.75.75 0 1 1-1.06-1.06l6.22-6.22H3a.75.75 0 0 1 0-1.5h16.19l-6.22-6.22a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg></div>
                    </div>`;
            }
            recentSearchesContainer.innerHTML += searchCard;
        });

        document.querySelectorAll('.recent-search-item').forEach(item => {
            item.addEventListener('click', () => {
                const type = item.dataset.type;
                if (type === 'route') {
                    startLocationInput.value = item.dataset.source;
                    endLocationInput.value = item.dataset.destination;
                    busNumberInput.value = '';
                } else if (type === 'bus') {
                    busNumberInput.value = item.dataset.number;
                    startLocationInput.value = '';
                    endLocationInput.value = '';
                }
                performSearch();
            });
        });
    };

    const updateQuickStopsUI = () => {
        quickStopsContainer.innerHTML = '';
        if (quickStops.length === 0) {
            quickStopsContainer.innerHTML = `<div class="bg-gray-200 p-4 rounded-xl text-sm text-center text-gray-500">Save routes for one-tap access.</div>`;
            return;
        }
        quickStops.forEach(stop => {
            let stopCard = '';
            if (stop.type === 'route') {
                const iconBg = stop.purpose === 'Work' ? 'bg-blue-200 text-blue-700' : 'bg-purple-200 text-purple-700';
                const iconSvg = stop.purpose === 'Work'
                    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M9.75 5.25A2.25 2.25 0 0 0 7.5 7.5v9a2.25 2.25 0 0 0 2.25 2.25h4.5a2.25 2.25 0 0 0 2.25-2.25V7.5A2.25 2.25 0 0 0 14.25 5.25H9.75ZM9 7.5a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 .75.75v9a.75.75 0 0 1-.75.75h-4.5a.75.75 0 0 1-.75-.75V7.5Z" clip-rule="evenodd" /></svg>`
                    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"><path d="M11.47 3.84a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 0 1.06-1.06l-8.69-8.69a2.25 2.25 0 0 0-3.18 0l-8.69 8.69a.75.75 0 0 0 1.06 1.06l8.69-8.69Z" /><path d="m12 5.432 8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75V21a.75.75 0 0 1-.75.75H5.625a1.875 1.875 0 0 1-1.875-1.875v-6.198a2.29 2.29 0 0 0 .091-.086L12 5.432Z" /></svg>`;
                stopCard = `
                    <div class="quick-stop-item bg-white p-3 rounded-xl shadow-sm flex items-center justify-between" data-type="route" data-source="${stop.source}" data-destination="${stop.destination}">
                        <div class="flex items-center">
                            <span class="${iconBg} p-2 rounded-full mr-3">${iconSvg}</span>
                            <div>
                                <div class="font-medium">${stop.purpose}</div>
                                <div class="text-sm text-gray-500 capitalize">${stop.source} to ${stop.destination}</div>
                            </div>
                        </div>
                        <div><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 text-gray-400"><path fill-rule="evenodd" d="M12.97 3.97a.75.75 0 0 1 1.06 0l7.5 7.5a.75.75 0 0 1 0 1.06l-7.5 7.5a.75.75 0 1 1-1.06-1.06l6.22-6.22H3a.75.75 0 0 1 0-1.5h16.19l-6.22-6.22a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg></div>
                    </div>`;
            } else if (stop.type === 'bus') {
                stopCard = `
                    <div class="quick-stop-item bg-white p-3 rounded-xl shadow-sm flex items-center justify-between" data-type="bus" data-number="${stop.number}">
                         <div class="flex items-center">
                            <span class="bg-gray-200 text-gray-700 p-2 rounded-full mr-3">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"><path d="M3.375 3C2.339 3 1.5 3.84 1.5 4.875v.75c0 1.036.84 1.875 1.875 1.875h17.25c1.035 0 1.875-.84 1.875-1.875v-.75C22.5 3.839 21.66 3 20.625 3H3.375Z" /><path fill-rule="evenodd" d="M3.087 9l.54 9.176A3 3 0 0 0 6.62 21h10.757a3 3 0 0 0 2.995-2.824L20.913 9H3.087ZM12 10.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5a.75.75 0 0 1 .75-.75Z" clip-rule="evenodd" /></svg>
                            </span>
                            <div>
                                <div class="font-medium capitalize">${stop.name}</div>
                                <div class="text-sm text-gray-500 uppercase">${stop.number}</div>
                            </div>
                        </div>
                        <div><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 text-gray-400"><path fill-rule="evenodd" d="M12.97 3.97a.75.75 0 0 1 1.06 0l7.5 7.5a.75.75 0 0 1 0 1.06l-7.5 7.5a.75.75 0 1 1-1.06-1.06l6.22-6.22H3a.75.75 0 0 1 0-1.5h16.19l-6.22-6.22a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg></div>
                    </div>`;
            }
            quickStopsContainer.innerHTML += stopCard;
        });

        document.querySelectorAll('.quick-stop-item').forEach(item => {
            item.addEventListener('click', () => {
                const type = item.dataset.type;
                if (type === 'route') {
                    startLocationInput.value = item.dataset.source;
                    endLocationInput.value = item.dataset.destination;
                    busNumberInput.value = '';
                } else if (type === 'bus') {
                    busNumberInput.value = item.dataset.number;
                    startLocationInput.value = '';
                    endLocationInput.value = '';
                }
                performSearch();
            });
        });
    };

    // --- 7. EVENT LISTENER SETUP ---
    saveWorkBtn.addEventListener('click', () => addQuickStop(currentSearch.type === 'bus' ? 'Bus' : 'Work'));
    saveHomeBtn.addEventListener('click', () => addQuickStop('Home'));
    saveOtherBtn.addEventListener('click', hideQuickStopModal);
    searchButton.addEventListener('click', performSearch);
    startLocationInput.addEventListener('blur', () => validateInput(startLocationInput, startError));
    endLocationInput.addEventListener('blur', () => validateInput(endLocationInput, endError));
    swapButton.addEventListener('click', () => {
        const temp = startLocationInput.value;
        startLocationInput.value = endLocationInput.value;
        endLocationInput.value = temp;
    });
    setupAutocomplete(startLocationInput, startSuggestions);
    setupAutocomplete(endLocationInput, endSuggestions);
    document.addEventListener('click', (e) => {
        if (!startLocationInput.contains(e.target)) startSuggestions.style.display = 'none';
        if (!endLocationInput.contains(e.target)) endSuggestions.style.display = 'none';
    });
    crowdOptions.forEach(option => {
        option.addEventListener('click', () => {
            crowdOptions.forEach(opt => {
                opt.classList.remove('bg-red-700'); opt.classList.add('bg-gray-200');
                opt.querySelector('.font-semibold').classList.remove('text-white'); opt.querySelector('.font-semibold').classList.add('text-gray-800');
                opt.querySelector('.text-sm').classList.remove('text-white'); opt.querySelector('.text-sm').classList.add('text-gray-500');
            });
            option.classList.remove('bg-gray-200'); option.classList.add('bg-red-700');
            option.querySelector('.font-semibold').classList.remove('text-gray-800'); option.querySelector('.font-semibold').classList.add('text-white');
            option.querySelector('.text-sm').classList.remove('text-gray-500'); option.querySelector('.text-sm').classList.add('text-white');
        });
    });
    submitCrowdBtn.addEventListener('click', () => {
        alert('Thank you for your report!');
        showScreen('live-map-screen');
    });

    // --- 8. INITIAL APP STARTUP ---
    updateQuickStopsUI();
    updateRecentSearchesUI();
    showScreen('home-screen');
});
