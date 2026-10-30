const API_URL = "/api/destinations";

const FALLBACK_IMAGE =
    "https://placehold.co/800x500/9a98b5/ffffff?text=Explore+the+World";

const VALID_CATEGORIES = [
    "Beach",
    "Mountain",
    "City",
    "Adventure",
    "Nature",
    "Historical",
    "Other"
];

const VALID_STATUSES = ["Wishlist", "Planned", "Visited"];

let destinations = [];
let toastTimer;
let formSubmitted = false;

const touchedFields = new Set();

const destinationGrid = document.getElementById("destinationGrid");
const destinationModal = document.getElementById("destinationModal");
const destinationForm = document.getElementById("destinationForm");

const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const statusFilter = document.getElementById("statusFilter");
const countryFilter = document.getElementById("countryFilter");

const emptyState = document.getElementById("emptyState");
const noResults = document.getElementById("noResults");
const loadingState = document.getElementById("loadingState");

const saveButton = document.getElementById("saveDestinationBtn");
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const navLinks = document.getElementById("navLinks");

// Image Lightbox Elements
const imageLightbox = document.getElementById("imageLightbox");
const lightboxImage = document.getElementById("lightboxImage");
const lightboxCaption = document.getElementById("lightboxCaption");
const lightboxClose = document.getElementById("lightboxClose");

const formFields = [
    "destinationName",
    "country",
    "category",
    "description",
    "estimatedBudget",
    "travelDate",
    "status",
    "imageUrl"
];

document.addEventListener("DOMContentLoaded", () => {
    attachEventListeners();
    updateDescriptionCounter();
    fetchDestinations();
});

function attachEventListeners() {

    // Open the add destination modal.
    ["navAddBtn", "heroAddBtn", "sectionAddBtn", "emptyAddBtn"].forEach(id => {
        const button = document.getElementById(id);

        if (button) {
            button.addEventListener("click", openAddModal);
        }
    });

    // Close the modal.
    document.getElementById("closeModalBtn")
        .addEventListener("click", closeModal);

    document.getElementById("cancelModalBtn")
        .addEventListener("click", closeModal);

    destinationForm.addEventListener("submit", handleFormSubmit);

    // Validate fields while typing and when leaving a field.
    formFields.forEach(id => {
        const field = document.getElementById(id);

        if (!field) return;

        const eventName = field.tagName === "SELECT" ? "change" : "input";

        field.addEventListener(eventName, () => {

            if (id === "description") {
                updateDescriptionCounter();
            }

            if (formSubmitted || touchedFields.has(id)) {
                validateField(id);
                updateFormSummary();
            }

            // Revalidate the date when the travel status changes.
            if (
                id === "status" &&
                (formSubmitted || touchedFields.has("travelDate"))
            ) {
                validateField("travelDate");
                updateFormSummary();
            }
        });

        field.addEventListener("blur", () => {
            touchedFields.add(id);
            validateField(id);
            updateFormSummary();
        });
    });

    // Search and filters.
    searchInput.addEventListener("input", applyFilters);

    categoryFilter.addEventListener("change", applyFilters);
    statusFilter.addEventListener("change", applyFilters);
    countryFilter.addEventListener("change", applyFilters);

    // Clear search.
    document.getElementById("clearSearchBtn")
        .addEventListener("click", () => {
            searchInput.value = "";
            applyFilters();
            searchInput.focus();
        });

    // Reset filters.
    document.getElementById("resetFiltersBtn")
        .addEventListener("click", resetFilters);

    document.getElementById("noResultsResetBtn")
        .addEventListener("click", resetFilters);

    // Toast notification.
    document.getElementById("closeToastBtn")
        .addEventListener("click", hideToast);

    // Mobile navigation.
    mobileMenuBtn.addEventListener("click", toggleMobileMenu);

    navLinks.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", closeMobileMenu);
    });

    document.getElementById("navAddBtn")
        .addEventListener("click", closeMobileMenu);

    // Close modal by clicking outside.
    destinationModal.addEventListener("click", event => {
        if (event.target === destinationModal) {
            closeModal();
        }
    });

    // Close modal using Escape.
    document.addEventListener("keydown", event => {
        if (
            event.key === "Escape" &&
            destinationModal.classList.contains("active")
        ) {
            closeModal();
        }
    });

    // Edit and delete actions on destination cards.
    destinationGrid.addEventListener("click", handleCardActions);

    // Open enlarged destination image
    destinationGrid.addEventListener("click", event => {

        const image = event.target.closest(".destination-image");

        if (!image) return;

        lightboxImage.src = image.src;
        lightboxImage.alt = image.alt;
        lightboxCaption.textContent = image.alt;

        imageLightbox.classList.add("active");
        imageLightbox.setAttribute("aria-hidden", "false");

        document.body.classList.add("modal-open");

        lightboxClose.focus();
    });


    // Close image preview
    lightboxClose.addEventListener("click", closeImageLightbox);


    // Close preview when clicking outside the image
    imageLightbox.addEventListener("click", event => {

        if (event.target === imageLightbox) {
            closeImageLightbox();
        }

    });


    // Close preview using Escape
    document.addEventListener("keydown", event => {

        if (
            event.key === "Escape" &&
            imageLightbox.classList.contains("active")
        ) {
            closeImageLightbox();
        }

    });
}


// ==========================================
// FETCH DESTINATIONS
// ==========================================

async function fetchDestinations() {

    loadingState.hidden = false;
    destinationGrid.hidden = true;
    emptyState.hidden = true;
    noResults.hidden = true;

    try {

        const response = await fetch(API_URL);
        const result = await readResponse(response);

        if (!response.ok) {
            throw new Error(
                getApiErrorMessage(
                    result,
                    "Unable to retrieve destinations."
                )
            );
        }

        destinations = Array.isArray(result)
            ? result
            : (
                Array.isArray(result.destinations)
                    ? result.destinations
                    : []
            );

        updateStatistics();
        populateCountryFilter();
        applyFilters();

    } catch (error) {

        console.error("Fetch error:", error);

        showToast(
            error.message ||
            "Unable to connect to the server. Please try again.",
            true
        );

        destinationGrid.innerHTML = "";
        destinationGrid.hidden = true;
        emptyState.hidden = true;
        noResults.hidden = true;

    } finally {

        loadingState.hidden = true;

    }
}


// ==========================================
// RENDER DESTINATION CARDS
// ==========================================

function renderDestinations(items) {

    destinationGrid.innerHTML = "";

    if (items.length === 0) {
        destinationGrid.hidden = true;
        return;
    }

    destinationGrid.hidden = false;

    items.forEach((destination, index) => {

        const card = document.createElement("article");

        card.className = "destination-card";
        card.style.animationDelay = `${index * 0.05}s`;

        const statusClass = getStatusClass(destination.status);

        const formattedBudget = formatCurrency(
            destination.estimatedBudget
        );

        const formattedDate = destination.travelDate
            ? formatDate(destination.travelDate)
            : "Not scheduled";

        const image = isValidImageUrl(destination.imageUrl)
            ? destination.imageUrl
            : FALLBACK_IMAGE;

        card.innerHTML = `
            <div class="destination-image-wrap">

                <img
                    class="destination-image"
                    src="${escapeHTML(image)}"
                    alt="${escapeHTML(destination.destinationName || "Travel destination")}"
                    loading="lazy"
                >

                <span class="destination-category">
                    ${escapeHTML(destination.category || "Other")}
                </span>

            </div>

            <div class="destination-card-content">

                <div class="destination-location">
                    <i class="fa-solid fa-location-dot" aria-hidden="true"></i>
                    ${escapeHTML(destination.country || "")}
                </div>

                <h3>
                    ${escapeHTML(destination.destinationName || "Untitled destination")}
                </h3>

                <p class="destination-description">
                    ${escapeHTML(destination.description || "")}
                </p>

                <div class="destination-meta">

                    <span class="meta-item">
                        <i class="fa-solid fa-wallet" aria-hidden="true"></i>
                        ${escapeHTML(formattedBudget)}
                    </span>

                    <span class="meta-item">
                        <i class="fa-regular fa-calendar" aria-hidden="true"></i>
                        ${escapeHTML(formattedDate)}
                    </span>

                </div>

                <div class="destination-actions">

                    <span class="destination-status ${statusClass}">
                        ${escapeHTML(destination.status || "Wishlist")}
                    </span>

                    <div class="card-buttons">

                        <button
                            class="card-edit-btn"
                            data-action="edit"
                            data-id="${escapeHTML(destination._id)}"
                            aria-label="Edit ${escapeHTML(destination.destinationName)}"
                        >
                            <i class="fa-solid fa-pen" aria-hidden="true"></i>
                            Edit
                        </button>

                        <button
                            class="card-delete-btn"
                            data-action="delete"
                            data-id="${escapeHTML(destination._id)}"
                            aria-label="Delete ${escapeHTML(destination.destinationName)}"
                        >
                            <i class="fa-regular fa-trash-can" aria-hidden="true"></i>
                            Delete
                        </button>

                    </div>

                </div>

            </div>
        `;

        const imageElement = card.querySelector(".destination-image");

        imageElement.addEventListener("error", () => {
            imageElement.src = FALLBACK_IMAGE;
        }, { once: true });

        destinationGrid.appendChild(card);

    });
}


// ==========================================
// SEARCH AND FILTERS
// ==========================================

function applyFilters() {

    const searchTerm = searchInput.value.trim().toLowerCase();

    const selectedCategory = categoryFilter.value;
    const selectedStatus = statusFilter.value;
    const selectedCountry = countryFilter.value;

    const filteredDestinations = destinations.filter(destination => {

        const name = String(
            destination.destinationName || ""
        ).toLowerCase();

        const country = String(
            destination.country || ""
        ).toLowerCase();

        const matchesSearch =
            name.includes(searchTerm) ||
            country.includes(searchTerm);

        const matchesCategory =
            !selectedCategory ||
            destination.category === selectedCategory;

        const matchesStatus =
            !selectedStatus ||
            destination.status === selectedStatus;

        const matchesCountry =
            !selectedCountry ||
            destination.country === selectedCountry;

        return (
            matchesSearch &&
            matchesCategory &&
            matchesStatus &&
            matchesCountry
        );

    });

    document.getElementById("clearSearchBtn").style.display =
        searchTerm ? "block" : "none";

    if (destinations.length === 0) {

        emptyState.hidden = false;
        noResults.hidden = true;
        destinationGrid.hidden = true;

        document.getElementById("resultsText").textContent =
            "Your collection is waiting for its first destination.";

        return;
    }

    if (filteredDestinations.length === 0) {

        destinationGrid.hidden = true;
        emptyState.hidden = true;
        noResults.hidden = false;

    } else {

        emptyState.hidden = true;
        noResults.hidden = true;

        renderDestinations(filteredDestinations);

    }

    document.getElementById("resultsText").textContent =
        `Showing ${filteredDestinations.length} of ${destinations.length} destinations`;

}


// ==========================================
// COUNTRY FILTER
// ==========================================

function populateCountryFilter() {

    const selectedValue = countryFilter.value;

    const countries = [
        ...new Set(
            destinations
                .map(destination => destination.country)
                .filter(Boolean)
        )
    ].sort((a, b) => a.localeCompare(b));

    countryFilter.innerHTML =
        '<option value="">All Countries</option>';

    countries.forEach(country => {

        const option = document.createElement("option");

        option.value = country;
        option.textContent = country;

        countryFilter.appendChild(option);

    });

    if (countries.includes(selectedValue)) {
        countryFilter.value = selectedValue;
    }

}


// ==========================================
// UPDATE STATISTICS
// ==========================================

function updateStatistics() {

    const total = destinations.length;

    const wishlist = destinations.filter(
        item => item.status === "Wishlist"
    ).length;

    const planned = destinations.filter(
        item => item.status === "Planned"
    ).length;

    const visited = destinations.filter(
        item => item.status === "Visited"
    ).length;

    document.getElementById("totalDestinations").textContent = total;
    document.getElementById("wishlistCount").textContent = wishlist;
    document.getElementById("plannedCount").textContent = planned;
    document.getElementById("visitedCount").textContent = visited;

}


// ==========================================
// OPEN AND CLOSE MODAL
// ==========================================

function openAddModal() {

    destinationForm.reset();

    document.getElementById("destinationId").value = "";

    document.getElementById("modalTitle").textContent =
        "Add a destination";

    saveButton.innerHTML =
        '<i class="fa-solid fa-plus"></i> Save destination';

    clearValidation();
    updateDescriptionCounter();

    destinationModal.classList.add("active");

    destinationModal.setAttribute("aria-hidden", "false");

    document.body.classList.add("modal-open");

    window.setTimeout(() => {
        document.getElementById("destinationName").focus();
    }, 100);

}


function closeModal() {

    destinationModal.classList.remove("active");

    destinationModal.setAttribute("aria-hidden", "true");

    document.body.classList.remove("modal-open");

    destinationForm.reset();

    clearValidation();
    updateDescriptionCounter();

}


// ==========================================
// FORM SUBMISSION
// ==========================================

async function handleFormSubmit(event) {

    event.preventDefault();

    formSubmitted = true;

    const isFormValid = validateForm();

    if (!isFormValid) {

        updateFormSummary();

        const firstInvalidField = formFields
            .map(id => document.getElementById(id))
            .find(field =>
                field &&
                field.getAttribute("aria-invalid") === "true"
            );

        if (firstInvalidField) {

            firstInvalidField.focus();

            firstInvalidField.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });

        }

        return;
    }

    const destinationId =
        document.getElementById("destinationId").value;

    const destinationData = {

        destinationName:
            document.getElementById("destinationName").value.trim(),

        country:
            document.getElementById("country").value.trim(),

        category:
            document.getElementById("category").value,

        description:
            document.getElementById("description").value.trim(),

        estimatedBudget:
            Number(document.getElementById("estimatedBudget").value),

        travelDate:
            document.getElementById("travelDate").value || null,

        status:
            document.getElementById("status").value,

        imageUrl:
            document.getElementById("imageUrl").value.trim()

    };

    const method = destinationId ? "PUT" : "POST";

    const url = destinationId
        ? `${API_URL}/${encodeURIComponent(destinationId)}`
        : API_URL;

    setSavingState(true);

    try {

        const response = await fetch(url, {

            method,

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(destinationData)

        });

        const result = await readResponse(response);

        if (!response.ok) {

            throw new Error(
                getApiErrorMessage(
                    result,
                    "Unable to save this destination."
                )
            );

        }

        closeModal();

        await fetchDestinations();

        showToast(
            destinationId
                ? "Your destination has been updated successfully."
                : "Your destination has been added to the list."
        );

    } catch (error) {

        console.error("Save error:", error);

        showToast(
            error.message ||
            "Something went wrong while saving. Please try again.",
            true
        );

    } finally {

        setSavingState(false, Boolean(destinationId));

    }

}


// ==========================================
// FORM VALIDATION
// ==========================================

function validateForm() {

    let valid = true;

    formFields.forEach(id => {

        if (!validateField(id)) {
            valid = false;
        }

    });

    return valid;

}


function validateField(id) {

    const field = document.getElementById(id);

    if (!field) return true;

    const value = field.value.trim();

    const status = document.getElementById("status").value;

    let error = "";
    let success = "";

    switch (id) {

        case "destinationName":

            if (!value) {

                error = "Please enter a destination name.";

            } else if (value.length < 2) {

                error = "Destination name must contain at least 2 characters.";

            } else if (value.length > 60) {

                error = "Destination name cannot exceed 60 characters.";

            } else if (!/[\p{L}\p{N}]/u.test(value)) {

                error = "Enter a name containing at least one letter or number.";

            } else {

                success = "That destination name looks good.";

            }

            break;


        case "country":

            if (!value) {

                error = "Please enter the country name.";

            } else if (value.length < 2 || value.length > 60) {

                error = "Country name must be between 2 and 60 characters.";

            } else if (!/^[\p{L}\p{M}][\p{L}\p{M}\s.,'’()&/-]*$/u.test(value)) {

                error = "Use letters, spaces and common punctuation only.";

            } else {

                success = "Country name looks good.";

            }

            break;


        case "category":

            if (!value) {

                error = "Please select a destination category.";

            } else if (!VALID_CATEGORIES.includes(value)) {

                error = "Please choose one of the available categories.";

            } else {

                success = "Category selected.";

            }

            break;


        case "description":

            if (!value) {

                error = "Please add a short description of this destination.";

            } else if (value.length < 10) {

                error = `Please write at least 10 characters. You have entered ${value.length}.`;

            } else if (value.length > 500) {

                error = "Description cannot exceed 500 characters.";

            } else {

                success = "Description looks good.";

            }

            break;


        case "estimatedBudget": {

            const rawValue = field.value;
            const amount = Number(rawValue);

            if (rawValue === "") {

                error = "Please enter your estimated budget.";

            } else if (!Number.isFinite(amount)) {

                error = "Enter a valid numeric budget.";

            } else if (amount < 0) {

                error = "Budget cannot be negative.";

            } else if (!Number.isInteger(amount)) {

                error = "Please enter the budget as a whole number (without decimals).";

            } else if (amount > 1000000000) {

                error = "Please enter a budget below ₹1,00,00,00,000.";

            } else {

                success = `Budget entered: ${formatCurrency(amount)}.`;

            }

            break;

        }


        case "travelDate":

            if (value) {

                if (!isValidDateInput(value)) {

                    error = "Please choose a valid travel date.";

                } else {

                    const today = getLocalDateString();

                    if (
                        (status === "Wishlist" || status === "Planned") &&
                        value < today
                    ) {

                        error = "For Wishlist or Planned trips, choose today or a future date.";

                    } else if (status === "Visited" && value > today) {

                        error = "A visited destination cannot have a future travel date.";

                    } else {

                        success = "Travel date looks good.";

                    }

                }

            }

            break;


        case "status":

            if (!VALID_STATUSES.includes(value)) {

                error = "Please select a valid travel status.";

            } else {

                success = "Travel status selected.";

            }

            break;


        case "imageUrl":

            if (value) {

                if (value.length > 2048) {

                    error = "Image URL is too long. Please use a shorter URL.";

                } else if (!isValidImageUrl(value)) {

                    error = "Enter a complete image URL starting with http:// or https://.";

                } else {

                    success = "Image link format looks good.";

                }

            }

            break;

    }

    setFieldFeedback(id, error, success);

    return !error;

}


// ==========================================
// FIELD VALIDATION FEEDBACK
// ==========================================

function setFieldFeedback(id, error, success) {

    const field = document.getElementById(id);

    const errorElement =
        document.getElementById(`${id}Error`);

    const successElement =
        document.getElementById(`${id}Success`);

    const group = field.closest(".form-group");

    field.classList.toggle("is-invalid", Boolean(error));

    field.classList.toggle(
        "is-valid",
        Boolean(success) && !error
    );

    field.setAttribute(
        "aria-invalid",
        error ? "true" : "false"
    );

    if (group) {

        group.classList.toggle("has-error", Boolean(error));

        group.classList.toggle(
            "has-success",
            Boolean(success) && !error
        );

    }

    if (errorElement) {
        errorElement.textContent = error;
    }

    if (successElement) {
        successElement.textContent =
            success && !error ? success : "";
    }

}


function updateFormSummary() {

    const summary =
        document.getElementById("formFeedbackSummary");

    const message =
        document.getElementById("formFeedbackMessage");

    const invalidCount = formFields.filter(id => {

        const field = document.getElementById(id);

        return (
            field &&
            field.getAttribute("aria-invalid") === "true"
        );

    }).length;

    if (invalidCount > 0) {

        message.textContent =
            `Please correct ${invalidCount} ${invalidCount === 1 ? "field" : "fields"} highlighted below before saving.`;

        summary.hidden = false;

    } else {

        summary.hidden = true;

    }

}


function clearValidation() {

    formSubmitted = false;

    touchedFields.clear();

    formFields.forEach(id => {

        const field = document.getElementById(id);

        if (!field) return;

        field.classList.remove("is-invalid", "is-valid");

        field.removeAttribute("aria-invalid");

        const group = field.closest(".form-group");

        if (group) {
            group.classList.remove("has-error", "has-success");
        }

        const errorElement =
            document.getElementById(`${id}Error`);

        const successElement =
            document.getElementById(`${id}Success`);

        if (errorElement) {
            errorElement.textContent = "";
        }

        if (successElement) {
            successElement.textContent = "";
        }

    });

    document.getElementById("formFeedbackSummary").hidden = true;

}


// ==========================================
// DESCRIPTION CHARACTER COUNTER
// ==========================================

function updateDescriptionCounter() {

    const description =
        document.getElementById("description");

    const counter =
        document.getElementById("descriptionCounter");

    if (description && counter) {

        counter.textContent =
            `${description.value.length} / 500`;

        counter.classList.toggle(
            "near-limit",
            description.value.length >= 450
        );

    }

}


// ==========================================
// SAVE BUTTON STATE
// ==========================================

function setSavingState(isSaving, isEditing = false) {

    saveButton.disabled = isSaving;

    if (isSaving) {

        saveButton.innerHTML =
            '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Saving...';

        saveButton.setAttribute("aria-busy", "true");

    } else {

        saveButton.removeAttribute("aria-busy");

        saveButton.innerHTML = isEditing
            ? '<i class="fa-solid fa-floppy-disk"></i> Update destination'
            : '<i class="fa-solid fa-plus"></i> Save destination';

    }

}


// ==========================================
// EDIT DESTINATION
// ==========================================

function editDestination(id) {

    const destination = destinations.find(
        item => item._id === id
    );

    if (!destination) {

        showToast(
            "We couldn't find that destination. Refresh and try again.",
            true
        );

        return;

    }

    destinationForm.reset();

    clearValidation();

    document.getElementById("destinationId").value =
        destination._id;

    document.getElementById("destinationName").value =
        destination.destinationName || "";

    document.getElementById("country").value =
        destination.country || "";

    document.getElementById("category").value =
        destination.category || "";

    document.getElementById("description").value =
        destination.description || "";

    document.getElementById("estimatedBudget").value =
        destination.estimatedBudget ?? "";

    document.getElementById("travelDate").value =
        destination.travelDate
            ? toLocalDateInputValue(destination.travelDate)
            : "";

    document.getElementById("status").value =
        destination.status || "Wishlist";

    document.getElementById("imageUrl").value =
        destination.imageUrl || "";

    document.getElementById("modalTitle").textContent =
        "Edit destination";

    saveButton.innerHTML =
        '<i class="fa-solid fa-floppy-disk"></i> Update destination';

    updateDescriptionCounter();

    destinationModal.classList.add("active");

    destinationModal.setAttribute("aria-hidden", "false");

    document.body.classList.add("modal-open");

    window.setTimeout(() => {
        document.getElementById("destinationName").focus();
    }, 100);

}


// ==========================================
// DELETE DESTINATION
// ==========================================

async function deleteDestination(id) {

    const destination = destinations.find(
        item => item._id === id
    );

    if (!destination) {

        showToast(
            "We couldn't find that destination. Refresh and try again.",
            true
        );

        return;

    }

    const confirmed = window.confirm(
        `Are you sure you want to delete "${destination.destinationName}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {

        const response = await fetch(
            `${API_URL}/${encodeURIComponent(id)}`,
            {
                method: "DELETE"
            }
        );

        const result = await readResponse(response);

        if (!response.ok) {

            throw new Error(
                getApiErrorMessage(
                    result,
                    "Unable to delete this destination."
                )
            );

        }

        await fetchDestinations();

        showToast("Destination deleted successfully.");

    } catch (error) {

        console.error("Delete error:", error);

        showToast(
            error.message ||
            "Unable to delete this destination. Please try again.",
            true
        );

    }

}


// ==========================================
// CARD ACTIONS
// ==========================================

function handleCardActions(event) {

    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const id = button.dataset.id;

    if (button.dataset.action === "edit") {
        editDestination(id);
    }

    if (button.dataset.action === "delete") {
        deleteDestination(id);
    }

}


// ==========================================
// RESET FILTERS
// ==========================================

function resetFilters() {

    searchInput.value = "";

    categoryFilter.value = "";

    statusFilter.value = "";

    countryFilter.value = "";

    applyFilters();

}


// ==========================================
// MOBILE NAVIGATION
// ==========================================

function toggleMobileMenu() {

    const isOpen = navLinks.classList.toggle("open");

    mobileMenuBtn.setAttribute(
        "aria-expanded",
        String(isOpen)
    );

    mobileMenuBtn.innerHTML = isOpen
        ? '<i class="fa-solid fa-xmark"></i>'
        : '<i class="fa-solid fa-bars"></i>';

}


function closeMobileMenu() {

    navLinks.classList.remove("open");

    mobileMenuBtn.setAttribute("aria-expanded", "false");

    mobileMenuBtn.innerHTML =
        '<i class="fa-solid fa-bars"></i>';

}


// ==========================================
// TOAST NOTIFICATIONS
// ==========================================

function showToast(message, isError = false) {

    const toast = document.getElementById("toast");

    clearTimeout(toastTimer);

    document.getElementById("toastMessage").textContent =
        message;

    toast.classList.toggle("error", isError);

    document.getElementById("toastIcon").innerHTML = isError
        ? '<i class="fa-solid fa-exclamation"></i>'
        : '<i class="fa-solid fa-check"></i>';

    toast.classList.add("show");

    toastTimer = window.setTimeout(hideToast, 4500);

}


function hideToast() {

    document.getElementById("toast").classList.remove("show");

}


// ==========================================
// HELPER FUNCTIONS
// ==========================================

function getStatusClass(status) {

    const statusClasses = {
        Wishlist: "status-wishlist",
        Planned: "status-planned",
        Visited: "status-visited"
    };

    return statusClasses[status] || "status-wishlist";

}


function formatCurrency(amount) {

    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0
    }).format(Number(amount) || 0);

}


function formatDate(date) {

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
        return "Date unavailable";
    }

    return parsedDate.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });

}


function toLocalDateInputValue(date) {

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
        return "";
    }

    const year = parsedDate.getFullYear();

    const month = String(
        parsedDate.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        parsedDate.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;

}


function getLocalDateString() {

    const now = new Date();

    const year = now.getFullYear();

    const month = String(
        now.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        now.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;

}


function isValidDateInput(value) {

    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const [year, month, day] = value.split("-").map(Number);

    const date = new Date(year, month - 1, day);

    return (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
    );

}


function escapeHTML(value) {

    return String(value ?? "").replace(/[&<>"']/g, character => {

        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[character];

    });

}


function isValidImageUrl(value) {

    if (!value || typeof value !== "string") {
        return false;
    }

    try {

        const url = new URL(value);

        return (
            (url.protocol === "https:" || url.protocol === "http:") &&
            Boolean(url.hostname)
        );

    } catch {

        return false;

    }

}


async function readResponse(response) {

    const responseText = await response.text();

    if (!responseText) return {};

    try {

        return JSON.parse(responseText);

    } catch {

        return {
            message: responseText
        };

    }

}


function getApiErrorMessage(result, fallback) {

    if (!result || typeof result !== "object") {
        return fallback;
    }

    if (
        typeof result.error === "string" &&
        result.error.trim()
    ) {
        return result.error;
    }

    if (
        typeof result.message === "string" &&
        result.message.trim()
    ) {
        return result.message;
    }

    if (result.errors && typeof result.errors === "object") {

        const firstError = Object.values(result.errors)[0];

        if (typeof firstError === "string") {
            return firstError;
        }

        if (
            firstError &&
            typeof firstError.message === "string"
        ) {
            return firstError.message;
        }

    }

    return fallback;

}

function closeImageLightbox() {

    imageLightbox.classList.remove("active");
    imageLightbox.setAttribute("aria-hidden", "true");

    lightboxImage.src = "";
    lightboxCaption.textContent = "";

    if (!destinationModal.classList.contains("active")) {
        document.body.classList.remove("modal-open");
    }

}