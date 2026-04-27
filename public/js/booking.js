let selectedSeats = [];
let seatPrices = {
    regular: 0,
    vip: 0
};
let showId = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Must be logged in (using getToken from main.js)
    if (!getToken()) {
        alert('Please login to continue booking.');
        window.location.href = `login.html`;
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    showId = urlParams.get('showId');
    
    if (!showId) {
        window.location.href = 'index.html';
        return;
    }

    try {
        // Fetch show details and seats in parallel
        const [showDetails, seats] = await Promise.all([
            fetchAPI(`/shows/${showId}`),
            fetchAPI(`/shows/${showId}/seats`)
        ]);
        
        // Use prices from the show data
        seatPrices.regular = showDetails.price_regular; 
        seatPrices.vip = showDetails.price_vip; 

        document.getElementById('booking-main').style.display = 'block';
        renderSeats(seats);

    } catch (error) {
        showToast('Error loading seat layout: ' + error.message, 'error');
        console.error(error);
    }
});

function renderSeats(seats) {
    const container = document.getElementById('seats-container');
    container.innerHTML = '';

    // Group by row
    const rows = {};
    seats.forEach(seat => {
        if (!rows[seat.row_no]) rows[seat.row_no] = [];
        rows[seat.row_no].push(seat);
    });

    Object.keys(rows).sort().forEach(rowNo => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'seat-row';
        
        const label = document.createElement('div');
        label.className = 'row-label';
        label.textContent = rowNo;
        rowDiv.appendChild(label);

        rows[rowNo].forEach(seat => {
            const seatDiv = document.createElement('div');
            seatDiv.className = `seat ${seat.type} ${seat.status}`;
            seatDiv.dataset.id = seat.id;
            seatDiv.dataset.name = `${seat.row_no}${seat.seat_no}`;
            seatDiv.dataset.type = seat.type;
            seatDiv.dataset.status = seat.status;
            
            if (seat.status === 'available') {
                seatDiv.addEventListener('click', () => toggleSeat(seatDiv));
            }
            
            rowDiv.appendChild(seatDiv);
        });

        container.appendChild(rowDiv);
    });
}

function toggleSeat(seatElement) {
    const seatId = seatElement.dataset.id;
    const seatName = seatElement.dataset.name;
    const seatType = seatElement.dataset.type;
    const price = seatPrices[seatType];

    const isSelected = seatElement.classList.contains('selected');

    if (isSelected) {
        seatElement.classList.remove('selected');
        selectedSeats = selectedSeats.filter(s => s.id !== seatId);
    } else {
        // Max 10 seats
        if (selectedSeats.length >= 10) {
            alert('You can select maximum 10 seats per transaction.');
            return;
        }
        seatElement.classList.add('selected');
        selectedSeats.push({ id: seatId, name: seatName, type: seatType, price: price });
    }

    updateSummary();
}

function updateSummary() {
    const countEl = document.getElementById('summary-seats-count');
    const listEl = document.getElementById('selected-seats-list');
    const subtotalEl = document.getElementById('summary-subtotal');
    const feeEl = document.getElementById('summary-fee');
    const totalEl = document.getElementById('summary-total');
    const proceedBtn = document.getElementById('proceed-btn');

    countEl.textContent = selectedSeats.length;
    
    if (selectedSeats.length === 0) {
        listEl.textContent = 'No seats selected.';
        subtotalEl.textContent = '₹0.00';
        feeEl.textContent = '₹0.00';
        totalEl.textContent = '₹0.00';
        proceedBtn.disabled = true;
        proceedBtn.textContent = 'Proceed to Pay';
        return;
    }

    const seatNames = selectedSeats.map(s => s.name).join(', ');
    listEl.textContent = seatNames;

    const subtotal = selectedSeats.reduce((acc, curr) => acc + curr.price, 0);
    const convenienceFee = selectedSeats.length * 30; // ₹30 per ticket
    const total = subtotal + convenienceFee;

    subtotalEl.textContent = formatCurrency(subtotal);
    feeEl.textContent = formatCurrency(convenienceFee);
    totalEl.textContent = formatCurrency(total);

    proceedBtn.disabled = false;
    proceedBtn.textContent = `Pay ${formatCurrency(total)}`;
    
    // Attach payment action
    proceedBtn.onclick = () => confirmBooking(total);
}

async function confirmBooking(totalAmount) {
    const btn = document.getElementById('proceed-btn');
    btn.disabled = true;
    btn.textContent = 'Processing...';

    try {
        const res = await fetchAPI('/bookings', {
            method: 'POST',
            body: JSON.stringify({
                showId: parseInt(showId),
                seatIds: selectedSeats.map(s => parseInt(s.id)),
                totalAmount: totalAmount
            })
        });

        alert(`Booking Confirmed! Transaction ID: ${res.transactionId}`);
        window.location.href = `confirmation.html?bookingId=${res.bookingId}`;
    } catch (error) {
        alert('Booking failed: ' + error.message);
        btn.disabled = false;
        btn.textContent = `Pay ${formatCurrency(totalAmount)}`;
    }
}
