// API Base URL - Updated to match your actual endpoint
const API_BASE_URL = 'https://imeetserver2k25.onrender.com/event_details?event_id=';



// Current event data storage
let currentEventData = null;

// Load event data from API when dropdown changes
async function loadEventData() {
    const eventSelect = document.getElementById('eventSelect');
    const eventDetails = document.getElementById('eventDetails');
    const noData = document.getElementById('noData');
    const loading = document.getElementById('loading');
    const errorMessage = document.getElementById('errorMessage');

    const selectedEventId = eventSelect.value;

    // Hide all containers first
    hideAllContainers();

    if (selectedEventId) {
        // Show loading
        loading.classList.remove('hidden');

        try {
            // Construct the correct API URL
            const apiUrl = `${API_BASE_URL}${selectedEventId}`;
            console.log('Fetching from:', apiUrl); // Debug log

            // Fetch data from API
            const response = await fetch(apiUrl);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const apiResponse = await response.json();
            console.log('API Response:', apiResponse); // Debug log

            // Check if API response is successful
            if (apiResponse.success && apiResponse.data) {
                currentEventData = apiResponse.data;

                // Hide loading and show event details
                loading.classList.add('hidden');
                eventDetails.classList.remove('hidden');

                // Update event information
                updateEventInfo(currentEventData.event);

                // Load participants
                loadParticipants(currentEventData.participants || []);

                // Update dropdown option with actual event name
                updateDropdownOption(selectedEventId, currentEventData.event.name);

            } else {
                throw new Error('Invalid API response format or unsuccessful response');
            }

        } catch (error) {
            console.error('Error fetching event data:', error);

            // Hide loading and show error
            loading.classList.add('hidden');
            errorMessage.classList.remove('hidden');

            // Update error message with more details
            const errorElement = document.querySelector('#errorMessage p');
            errorElement.textContent = `Error loading event data: ${error.message}. Please try again.`;

            // Log error details for debugging
            console.error('Error details:', {
                eventId: selectedEventId,
                apiUrl: `${API_BASE_URL}${selectedEventId}`,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }

    } else {
        // No event selected - show default message
        noData.classList.remove('hidden');
    }
}

// Hide all container elements
function hideAllContainers() {
    document.getElementById('eventDetails').classList.add('hidden');
    document.getElementById('noData').classList.add('hidden');
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('errorMessage').classList.add('hidden');
}

// Update event information in the UI
function updateEventInfo(eventData) {
    document.getElementById('eventName').textContent = eventData.name || 'Unknown Event';
    document.getElementById('eventDate').textContent = `📅 ${formatDate(eventData.date)}`;
    document.getElementById('eventTime').textContent = `🕒 ${eventData.start_time} - ${eventData.end_time}`;
    document.getElementById('eventVenue').textContent = `📍 ${eventData.venue || 'TBD'}`;

    // Calculate total participants
    const participantCount = currentEventData.participants ? currentEventData.participants.length : 0;
    document.getElementById('totalParticipants').textContent = `👥 ${participantCount} Participants`;

    document.getElementById('eventDescription').textContent = eventData.details || 'No description available';
}

// Update dropdown option with actual event name
function updateDropdownOption(eventId, eventName) {
    const option = document.querySelector(`#eventSelect option[value="${eventId}"]`);
    if (option && eventName) {
        option.textContent = eventName;
    }
}

// Load participants into table
function loadParticipants(participants) {
    const tbody = document.getElementById('participantsBody');
    tbody.innerHTML = '';

    if (!participants || participants.length === 0) {
        const row = tbody.insertRow();
        row.innerHTML = `<td colspan="8" style="text-align: center; padding: 20px; color: #6c757d;">No participants registered yet</td>`;
        return;
    }

    participants.forEach((participant, index) => {
        const row = tbody.insertRow();
        const user = participant.user_participants;

        // Handle potential null/undefined values
        const name = user.name || 'N/A';
        const dept = user.dept || 'N/A';
        const year = user.year || 'N/A';
        const roll = user.college_roll || 'N/A';
        const email = user.email || 'N/A';
        const contact = user.contact_no || 'N/A';
        const regDate = formatDateTime(participant.created_at);

        row.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${name}</strong></td>
            <td>${dept}</td>
            <td>${year}</td>
            <td>${roll}</td>
            <td>${email}</td>
            <td>${contact}</td>
            <td>${regDate}</td>
        `;

        // Store original data for filtering (convert to lowercase for search)
        row.setAttribute('data-name', name.toString().toLowerCase());
        row.setAttribute('data-dept', dept.toString().toLowerCase());
        row.setAttribute('data-roll', roll.toString().toLowerCase());
        row.setAttribute('data-email', email.toString().toLowerCase());
    });
}

// Filter participants based on search
function filterParticipants() {
    const searchInput = document.getElementById('searchInput').value.toLowerCase();
    const rows = document.querySelectorAll('#participantsBody tr');

    let visibleCount = 0;

    rows.forEach(row => {
        // Skip the "no participants" row
        if (row.cells.length === 1) return;

        const name = row.getAttribute('data-name') || '';
        const dept = row.getAttribute('data-dept') || '';
        const roll = row.getAttribute('data-roll') || '';
        const email = row.getAttribute('data-email') || '';

        if (name.includes(searchInput) ||
            dept.includes(searchInput) ||
            roll.includes(searchInput) ||
            email.includes(searchInput)) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });

    // Update participant count based on visible rows
    if (currentEventData && currentEventData.participants) {
        const totalCount = currentEventData.participants.length;
        const countText = searchInput ? `👥 ${visibleCount} of ${totalCount} Participants` : `👥 ${totalCount} Participants`;
        document.getElementById('totalParticipants').textContent = countText;
    }
}

// Format date
function formatDate(dateString) {
    if (!dateString) return 'TBD';

    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (error) {
        return dateString;
    }
}

// Format date and time
function formatDateTime(dateTimeString) {
    if (!dateTimeString) return 'N/A';

    try {
        const date = new Date(dateTimeString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return dateTimeString;
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', function () {
    console.log('Event Registration Viewer loaded successfully!');
    console.log('API Base URL:', API_BASE_URL);

    // Clear search input on page load
    document.getElementById('searchInput').value = '';
});

// Handle API errors gracefully
window.addEventListener('unhandledrejection', function (event) {
    console.error('Unhandled promise rejection:', event.reason);

    // Show error message if event details are currently being loaded
    const loading = document.getElementById('loading');
    const errorMessage = document.getElementById('errorMessage');

    if (!loading.classList.contains('hidden')) {
        loading.classList.add('hidden');
        errorMessage.classList.remove('hidden');
    }
});
