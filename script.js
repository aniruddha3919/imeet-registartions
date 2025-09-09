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
    hideAllContainers();

    if (selectedEventId) {
        loading.classList.remove('hidden');

        try {
            // Using AllOrigins proxy
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://imeetserver2k25.onrender.com/event_details?event_id=${selectedEventId}`)}`;
            console.log('Fetching from proxy:', proxyUrl);

            const response = await fetch(proxyUrl);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const proxyResponse = await response.json();
            console.log('Proxy Response:', proxyResponse);

            // Parse the actual API response from allOrigins wrapper
            let apiResponse;
            if (proxyResponse.contents) {
                // AllOrigins wraps the response in 'contents'
                apiResponse = JSON.parse(proxyResponse.contents);
            } else {
                throw new Error('AllOrigins proxy returned invalid format');
            }

            console.log('Actual API Response:', apiResponse);

            if (apiResponse.success && apiResponse.data) {
                currentEventData = apiResponse.data;
                loading.classList.add('hidden');
                eventDetails.classList.remove('hidden');
                updateEventInfo(currentEventData.event);
                
                // Check if it's a team event or solo event
                if (currentEventData.event.is_team && currentEventData.teams) {
                    loadTeams(currentEventData.teams);
                } else if (currentEventData.participants) {
                    loadParticipants(currentEventData.participants);
                } else {
                    // No participants or teams
                    loadParticipants([]);
                }
                
                updateDropdownOption(selectedEventId, currentEventData.event.name);
            } else {
                throw new Error('Invalid API response format');
            }

        } catch (error) {
            console.error('Error:', error);
            loading.classList.add('hidden');
            errorMessage.classList.remove('hidden');

            const errorElement = document.querySelector('#errorText') || document.querySelector('#errorMessage p');
            if (error.message.includes('AllOrigins')) {
                errorElement.textContent = 'CORS proxy service is currently unavailable. Please try again later or contact the administrator.';
            } else {
                errorElement.textContent = `Error: ${error.message}`;
            }
        }
    } else {
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

    // Calculate total participants or teams
    let participantCount = 0;
    let countText = '';
    
    if (eventData.is_team && currentEventData.teams) {
        // Filter out teams with no members for counting
        const teamsWithMembers = currentEventData.teams.filter(team => team.members && team.members.length > 0);
        const totalTeams = teamsWithMembers.length;
        participantCount = teamsWithMembers.reduce((total, team) => total + team.members.length, 0);
        
        if (totalTeams > 0) {
            countText = `👥 ${participantCount} Participants in ${totalTeams} Teams`;
        } else {
            countText = `👥 0 Participants (${currentEventData.teams.length} teams registered, but no members added yet)`;
        }
    } else if (currentEventData.participants) {
        participantCount = currentEventData.participants.length;
        countText = `👥 ${participantCount} Participants`;
    } else {
        countText = `👥 0 Participants`;
    }
    
    document.getElementById('totalParticipants').textContent = countText;
    document.getElementById('eventDescription').textContent = eventData.details || 'No description available';
    
    // Update search placeholder based on event type
    const searchInput = document.getElementById('searchInput');
    if (eventData.is_team) {
        searchInput.placeholder = 'Search teams by name or members...';
    } else {
        searchInput.placeholder = 'Search participants by name, department, or roll number...';
    }
}

// Update dropdown option with actual event name
function updateDropdownOption(eventId, eventName) {
    const option = document.querySelector(`#eventSelect option[value="${eventId}"]`);
    if (option && eventName) {
        option.textContent = eventName;
    }
}

// Load teams for team events
function loadTeams(teams) {
    const tbody = document.getElementById('participantsBody');
    const thead = document.querySelector('#participantsTable thead tr');
    
    // Update table headers for team view
    thead.innerHTML = `
        <th>S.No</th>
        <th>Team Name</th>
        <th>Status</th>
        <th>Members</th>
        <th>Team Details</th>
        <th>Registration Date</th>
    `;
    
    tbody.innerHTML = '';

    if (!teams || teams.length === 0) {
        const row = tbody.insertRow();
        row.innerHTML = `<td colspan="6" style="text-align: center; padding: 20px; color: #6c757d;">No teams registered yet</td>`;
        return;
    }

    // Sort teams: teams with members first, then by member count (descending), then by registration date
    const sortedTeams = teams.sort((a, b) => {
        const aMemberCount = a.members ? a.members.length : 0;
        const bMemberCount = b.members ? b.members.length : 0;
        
        // Teams with members come first
        if (aMemberCount > 0 && bMemberCount === 0) return -1;
        if (aMemberCount === 0 && bMemberCount > 0) return 1;
        
        // Among teams with members, sort by member count (descending)
        if (aMemberCount !== bMemberCount) return bMemberCount - aMemberCount;
        
        // If same member count, sort by registration date (newest first)
        return new Date(b.created_at) - new Date(a.created_at);
    });

    sortedTeams.forEach((team, index) => {
        const row = tbody.insertRow();
        
        // Handle team data
        const teamName = team.team_name && team.team_name.trim() 
            ? team.team_name.trim() 
            : `<em style="color: #6c757d;">Team ${index + 1}</em>`;
        const memberCount = team.members ? team.members.length : 0;
        const regDate = formatDateTime(team.created_at);
        
        // Determine team status
        let statusHtml = '';
        if (memberCount === 0) {
            statusHtml = '<span class="status-badge status-empty">Empty</span>';
        } else if (memberCount === 1) {
            statusHtml = '<span class="status-badge status-incomplete">Incomplete</span>';
        } else {
            statusHtml = '<span class="status-badge status-complete">Complete</span>';
        }
        
        // Create members list
        let membersHtml = '';
        let teamDetailsHtml = '';
        
        if (team.members && team.members.length > 0) {
            membersHtml = `<div class="member-count-display">${memberCount} Member${memberCount > 1 ? 's' : ''}</div>`;
            
            teamDetailsHtml = '<div class="members-list">';
            team.members.forEach((member, memberIndex) => {
                const user = member.user_participants;
                const name = user.name || 'N/A';
                const dept = user.dept || 'N/A';
                const roll = user.college_roll || 'N/A';
                const email = user.email || 'N/A';
                const contact = user.contact_no || 'N/A';
                
                teamDetailsHtml += `
                    <div class="member-item">
                        <div class="member-header">
                            <strong>${memberIndex + 1}. ${name}</strong>
                            <span class="member-role">${memberIndex === 0 ? 'Team Leader' : 'Member'}</span>
                        </div>
                        <div class="member-details">
                            <small>📧 ${email}</small>
                            <small>🎓 ${dept} (${roll})</small>
                            ${contact !== 'N/A' ? `<small>📱 ${contact}</small>` : ''}
                        </div>
                    </div>
                `;
            });
            teamDetailsHtml += '</div>';
        } else {
            membersHtml = '<em style="color: #6c757d;">No members</em>';
            teamDetailsHtml = '<em style="color: #6c757d;">Team created but no members added yet</em>';
        }

        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${teamName}</td>
            <td>${statusHtml}</td>
            <td>${membersHtml}</td>
            <td>${teamDetailsHtml}</td>
            <td>${regDate}</td>
        `;

        // Store original data for filtering
        const searchData = [
            (team.team_name || '').toLowerCase(),
            team.members ? team.members.map(m => m.user_participants.name || '').join(' ').toLowerCase() : '',
            team.members ? team.members.map(m => m.user_participants.email || '').join(' ').toLowerCase() : '',
            team.members ? team.members.map(m => m.user_participants.dept || '').join(' ').toLowerCase() : '',
            team.members ? team.members.map(m => m.user_participants.college_roll || '').join(' ').toLowerCase() : ''
        ].join(' ');
        
        row.setAttribute('data-search', searchData);
        
        // Add row class based on status
        if (memberCount === 0) {
            row.classList.add('team-empty');
        } else if (memberCount === 1) {
            row.classList.add('team-incomplete');
        } else {
            row.classList.add('team-complete');
        }
    });
}

// Load participants for solo events
function loadParticipants(participants) {
    const tbody = document.getElementById('participantsBody');
    const thead = document.querySelector('#participantsTable thead tr');
    
    // Update table headers for participant view
    thead.innerHTML = `
        <th>S.No</th>
        <th>Name</th>
        <th>Department</th>
        <th>Year</th>
        <th>Roll Number</th>
        <th>Email</th>
        <th>Contact</th>
        <th>Registration Date</th>
    `;
    
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

        // Store original data for filtering
        const searchData = [name, dept, roll, email].join(' ').toLowerCase();
        row.setAttribute('data-search', searchData);
    });
}

// Filter participants/teams based on search
function filterParticipants() {
    const searchInput = document.getElementById('searchInput').value.toLowerCase();
    const rows = document.querySelectorAll('#participantsBody tr');

    let visibleCount = 0;

    rows.forEach(row => {
        // Skip the "no participants/teams" row
        if (row.cells.length <= 1 || row.innerHTML.includes('No participants') || row.innerHTML.includes('No teams')) return;

        const searchData = row.getAttribute('data-search') || '';

        if (searchData.includes(searchInput)) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });

    // Update count based on visible rows
    if (currentEventData) {
        const isTeamEvent = currentEventData.event.is_team;
        
        if (isTeamEvent && currentEventData.teams) {
            const teamsWithMembers = currentEventData.teams.filter(team => team.members && team.members.length > 0);
            const totalTeams = teamsWithMembers.length;
            const totalParticipants = teamsWithMembers.reduce((total, team) => total + team.members.length, 0);
            
            let countText = '';
            if (searchInput) {
                countText = `👥 ${visibleCount} of ${totalTeams} Teams shown`;
            } else if (totalTeams > 0) {
                countText = `👥 ${totalParticipants} Participants in ${totalTeams} Teams`;
            } else {
                countText = `👥 0 Participants (${currentEventData.teams.length} teams registered, but no members added yet)`;
            }
            
            document.getElementById('totalParticipants').textContent = countText;
        } else if (currentEventData.participants) {
            const totalCount = currentEventData.participants.length;
            const countText = searchInput ? `👥 ${visibleCount} of ${totalCount} Participants` : `👥 ${totalCount} Participants`;
            document.getElementById('totalParticipants').textContent = countText;
        }
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
