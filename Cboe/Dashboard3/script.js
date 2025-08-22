document.addEventListener("DOMContentLoaded", () => {

  // === DOM Elements ===
  const dashboardContainer = document.getElementById("dashboard-container");
  const sidebar = document.getElementById("sidebar");
  const sidebarToggleBtn = document.getElementById("sidebar-toggle");
  const hamburgerIcon = document.querySelector("#sidebar-toggle i");
  const mainContent = document.getElementById("main-content");
  const mobileOverlay = document.getElementById("mobile-overlay");
  const taskManager = document.getElementById("task-manager");
  const themeToggleBtn = document.getElementById("theme-toggle");
  const themeIcon = document.querySelector("#theme-toggle i");
  const profileDropdown = document.getElementById("profile-dropdown");
  const dropdownMenu = profileDropdown.querySelector(".dropdown-menu");
  const dashboardLink = document.getElementById("dashboard-link");


  // Notes Module
  const noteForm = document.getElementById("note-form");
  const noteTitleInput = document.getElementById("note-title");
  const noteContentTextarea = document.getElementById("note-content");
  const charCountSpan = document.getElementById("char-count");
  const addEditNoteBtn = document.getElementById("add-edit-note-btn");
  const noteListDiv = document.getElementById("note-list");
  const noNotesMessage = noteListDiv
    ? noteListDiv.querySelector(".no-notes-message")
    : null;


  // === TASK MANAGER ELEMENTS (Uncomment when using Tasks page) ===
  const tasksLink = document.getElementById("tasks-link");
  const taskForm = document.getElementById("task-form");
  const taskInput = document.getElementById("task-input");
  const taskList = document.getElementById("task-list");
  const taskCounter = document.getElementById("task-counter");

  // Modal Elements
  const modalOverlay = document.getElementById("modal-overlay");
  const modalTitle = document.getElementById("modal-title");
  const modalMessage = document.getElementById("modal-message");
  const modalFooter = document.getElementById("modal-footer");
  const modalCloseBtn = modalOverlay
    ? modalOverlay.querySelector(".modal-close-btn")
    : null;
  const modalHeader = modalOverlay
    ? modalOverlay.querySelector(".modal-header")
    : null;

  // Registration Modal
  const registerBtn = document.getElementById("register-btn");
  const registrationModalOverlay = document.getElementById(
    "registration-modal-overlay"
  );
  const registrationForm = document.getElementById("registration-form");
  const regCloseBtn = registrationModalOverlay
    ? registrationModalOverlay.querySelector(".registration-close-btn")
    : null;
  const regNameInput = document.getElementById("reg-name");
  const regEmailInput = document.getElementById("reg-email");
  const regUsernameInput = document.getElementById("reg-username");
  const regPasswordInput = document.getElementById("reg-password");
  const regConfirmPasswordInput = document.getElementById(
    "reg-confirm-password"
  );
  const regCourseSelect = document.getElementById("reg-course");
  const regTermsCheckbox = document.getElementById("reg-terms");

  // Image Upload
  const dropArea = document.getElementById("drop-area");
  const imageUploadInput = document.getElementById("image-upload-input");
  const browseFilesBtn = document.getElementById("browse-files-btn");
  const uploadPreview = document.getElementById("upload-preview");
  const uploadBtn = document.getElementById("upload-btn");
  const imageGallery = document.getElementById("image-gallery");
  const noImagesMessage = imageGallery
    ? imageGallery.querySelector(".no-images-message")
    : null;

  // === State Variables ===
  let notes = [];
  let editingNoteId = null;
  let selectedFiles = [];
  let uploadedImages = [];

  const TRUNCATION_LENGTH = 150;

  // === Modal Functions ===
  const showModal = (title, message, type = "info", callback = null) => {
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modalFooter.innerHTML = "";

    // Update modal header color based on type
    if (modalHeader) {
      modalHeader.className = "modal-header"; // Reset
      if (["success", "error", "warning"].includes(type)) {
        modalHeader.classList.add(type);
      }
    }

    if (type === "confirm" && callback) {
      const confirmBtn = document.createElement("button");
      confirmBtn.textContent = "Confirm";
      confirmBtn.classList.add("modal-btn", "confirm-btn");
      confirmBtn.addEventListener("click", () => {
        callback();
        hideModal();
      });

      const cancelBtn = document.createElement("button");
      cancelBtn.textContent = "Cancel";
      cancelBtn.classList.add("modal-btn", "cancel-btn");
      cancelBtn.addEventListener("click", hideModal);

      modalFooter.appendChild(confirmBtn);
      modalFooter.appendChild(cancelBtn);
    } else {
      const okBtn = document.createElement("button");
      okBtn.textContent = "OK";
      okBtn.classList.add("modal-btn", "primary-btn");
      okBtn.addEventListener("click", hideModal);
      modalFooter.appendChild(okBtn);
    }

    modalOverlay.classList.remove("hidden");
    modalOverlay.classList.add("visible");
  };

  const hideModal = () => {
    modalOverlay.classList.remove("visible");
    modalOverlay.classList.add("hidden");
  };

  // Close modal on backdrop click or close button
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener("click", hideModal);
    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) hideModal();
    });
  }

  /*
  
  // === Registration Modal Functions ===
  const openRegistrationModal = () => {
    registrationForm.reset();
    regTermsCheckbox.checked = false;
    registrationModalOverlay.classList.remove("hidden");
    registrationModalOverlay.classList.add("visible");
  };

  const closeRegistrationModal = () => {
    registrationModalOverlay.classList.remove("visible");
    registrationModalOverlay.classList.add("hidden");
  };

  const handleRegistrationSubmit = (e) => {
    e.preventDefault();

    const name = regNameInput.value.trim();
    const email = regEmailInput.value.trim();
    const username = regUsernameInput.value.trim();
    const password = regPasswordInput.value;
    const confirmPassword = regConfirmPasswordInput.value;
    const course = regCourseSelect.value;
    const termsAccepted = regTermsCheckbox.checked;

    if (
      ![name, email, username, password, confirmPassword, course].every(Boolean)
    ) {
      showModal("Registration Error", "All fields are required.", "error");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      showModal(
        "Registration Error",
        "Please enter a valid email address.",
        "error"
      );
      return;
    }

    if (password.length < 6) {
      showModal(
        "Registration Error",
        "Password must be at least 6 characters long.",
        "error"
      );
      return;
    }

    if (password !== confirmPassword) {
      showModal("Registration Error", "Passwords do not match.", "error");
      return;
    }

    if (!termsAccepted) {
      showModal(
        "Registration Error",
        "You must agree to the terms and conditions.",
        "error"
      );
      return;
    }

    showModal(
      "Registration Successful!",
      "Thank you for registering. You can now log in.",
      "success"
    );
    closeRegistrationModal();
  };

  */

  // === Dashboard Navigation ===
  const dashboardSections = [
    document.querySelector(".dashboard-overview"),
    document.querySelector(".recent-activity-section"),
    document.getElementById("page-title"),
  ];

  // dashboardLink.addEventListener("click", (e) => {
  //   e.preventDefault();
  //   dashboardSections.forEach((section) => (section.style.display = ""));
  //   // taskManager.style.display = "none";
  //   dashboardLink.classList.add("active");
  //   document.getElementById("page-title").textContent = "Dashboard";
  // });

  // Sidebar Toggle
  const mediaQuery = window.matchMedia("(max-width: 768px)");

  const toggleSidebar = () => {
    if (mediaQuery.matches) {
      sidebar.classList.toggle("open");
      mainContent.classList.toggle("pushed-mobile");
      mobileOverlay.classList.toggle("visible");
      sidebarToggleBtn.classList.toggle("is-active");
    } else {
      dashboardContainer.classList.toggle("sidebar-collapsed");
      sidebarToggleBtn.classList.toggle("is-active");
    }

    // ✅ Toggle icon: switch between fa-bars and fa-times
    if (hamburgerIcon.classList.contains("fa-bars")) {
      hamburgerIcon.classList.replace("fa-bars", "fa-times");
    } else {
      hamburgerIcon.classList.replace("fa-times", "fa-bars");
    }

  };

  sidebarToggleBtn.addEventListener("click", toggleSidebar);
  mobileOverlay.addEventListener("click", toggleSidebar);

  const setInitialSidebarState = () => {
    if (mediaQuery.matches) {
      sidebar.classList.remove("open");
      mainContent.classList.remove("pushed-mobile");
      mobileOverlay.classList.remove("visible");
      dashboardContainer.classList.remove("sidebar-collapsed");
    } else {
      dashboardContainer.classList.remove("sidebar-collapsed");
    }
    hamburgerIcon.classList.remove("fa-times");
    hamburgerIcon.classList.add("fa-bars");
    sidebarToggleBtn.classList.remove("is-active");
  };

  setInitialSidebarState();
  mediaQuery.addEventListener("change", setInitialSidebarState);

  // === Theme Toggle ===
  themeToggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    if (document.body.classList.contains("dark-mode")) {
      themeIcon.classList.replace("fa-moon", "fa-sun");
    } else {
      themeIcon.classList.replace("fa-sun", "fa-moon");
    }
  });

  // === Profile Dropdown ===
  profileDropdown.addEventListener("click", (e) => {
    dropdownMenu.classList.toggle("hidden");
    e.stopPropagation();
  });

  document.addEventListener("click", (e) => {
    if (!profileDropdown.contains(e.target)) {
      dropdownMenu.classList.add("hidden");
    }
  });

  // chart js
  let script = document.createElement('script');
  script.src = 'https://s3.tradingview.com/tv.js';
  script.onload = function () {
    new TradingView.widget({
      container_id: "tradingview_eurusd",
      autosize: true,
      symbol: "FX:EURUSD",
      width: "900px",
      height: 400,
      theme: "light"
    });
  };
  document.head.appendChild(script);

  const ctx = document.getElementById('analyticsChart').getContext('2d');

  const analyticsChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], // acending values
      datasets: [{
        lebel: 'Revenue',
        data: [3000, 2200, 2700, 1800, 1900, 2500, 4000, 3200, 1600, 3722, 2900, 3500], //acending values
        borderColor: '#dc691e', // copper brown
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        pointRadius: 0,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          ticks: {
            callback: value => `$${value / 1000}K`,
            color: '#999'
          },
          grid: {
            color: '#eee'
          }
        },
        x: {
          ticks: { color: '#888' },
          grid: { display: false }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function (context) {
              const val = context.raw;
              const convRate = (val / 5000 * 100).toFixed(1);
              return `$${val} • ${convRate}%`;
            }
          }
        },
        legend: { display: false },
      },
    }
  });


  // === Deposit Module ===
  const form = document.getElementById('depositForm');
  const modal = document.getElementById('statusModal');
  const title = document.getElementById('statusTitle');
  const message = document.getElementById('statusMessage');
  const closeBtn = document.getElementById('closeStatus');

  form.addEventListener('submit', function (e) {
    e.preventDefault(); // stop actual submission for demo

    const amount = document.getElementById('amount').value.trim();
    const method = document.getElementById('method').value;
    const proof = document.getElementById('proof').files[0];

    let errors = [];

    if (!amount || isNaN(amount) || amount <= 0) {
      errors.push('Enter a valid deposit amount.');
    }

    if (!method) {
      errors.push('Select a payment method.');
    }

    if (!proof) {
      errors.push('Upload your proof of payment.');
    } else {
      const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!validTypes.includes(proof.type)) {
        errors.push('Invalid file type. Upload a JPG, PNG, or PDF.');
      }
    }

    if (errors.length > 0) {
      alert(errors.join('\n'));
      return;
    }

    // showStatusModal('Deposit Pending', 'Your deposit has been submitted and is pending review.');

    title.textContent = 'Deposit Pending';
    message.textContent = 'Your deposit has been submitted and is under review.';
    modal.classList.add('active');

    setTimeout(() => {
      modal.click.remove('active');
    }, 2000);
  });


  closeBtn.onclick = () =>
    modal.classList.remove('active');

  window.onclick = (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  };


  // === Notes Module ===
  if (noteForm) {
    const loadNotes = () => {
      const stored = localStorage.getItem("adminx_notes");
      if (stored) notes = JSON.parse(stored);
      renderNotes();
    };

    const saveNotes = () => {
      localStorage.setItem("adminx_notes", JSON.stringify(notes));
    };

    const renderNotes = () => {
      noteListDiv.innerHTML = "";
      if (notes.length === 0) {
        noteListDiv.innerHTML =
          '<p class="no-notes-message">No notes yet. Add one above!</p>';
        return;
      }

      notes.forEach((note) => {
        const isTruncated = note.content.length > TRUNCATION_LENGTH;
        const displayContent = isTruncated
          ? note.content.substring(0, TRUNCATION_LENGTH) + "..."
          : note.content;

        const noteItem = document.createElement("div");
        noteItem.classList.add("note-item");
        noteItem.dataset.id = note.id;

        noteItem.innerHTML = `
          <div class="note-item-header">
            <h4 class="note-item-title">${note.title}</h4>
            <div class="note-actions">
              <button class="edit-btn"><i class="fas fa-edit"></i> Edit</button>
              <button class="delete-btn"><i class="fas fa-trash"></i> Delete</button>
            </div>
          </div>
          <p class="note-item-content" data-full-content="${note.content}">
            ${displayContent}
          </p>
          ${isTruncated
            ? '<button class="view-more-btn">View More</button>'
            : ""
          }
        `;

        noteListDiv.appendChild(noteItem);
      });
    };

    noteForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const title = noteTitleInput.value.trim();
      const content = noteContentTextarea.value.trim();

      if (!title || !content) {
        showModal(
          "Validation Error",
          "Note title and content cannot be empty.",
          "error"
        );
        return;
      }

      if (content.length > 250) {
        showModal(
          "Validation Error",
          "Note content cannot exceed 250 characters.",
          "error"
        );
        return;
      }

      if (editingNoteId) {
        const index = notes.findIndex((n) => n.id === editingNoteId);
        if (index !== -1) {
          notes[index] = { id: editingNoteId, title, content };
          showModal("Success", "Note updated successfully!", "success");
        }
        editingNoteId = null;
        addEditNoteBtn.textContent = "Add Note";
      } else {
        const newNote = { id: Date.now(), title, content };
        notes.unshift(newNote);
        showModal("Success", "Note added successfully!", "success");
      }

      saveNotes();
      renderNotes();
      noteForm.reset();
      charCountSpan.textContent = "0/250 characters";
    });

    noteListDiv.addEventListener("click", (e) => {
      const target = e.target;
      const noteItem = target.closest(".note-item");
      if (!noteItem) return;

      const noteId = parseInt(noteItem.dataset.id);
      const note = notes.find((n) => n.id === noteId);
      if (!note) return;

      if (
        target.classList.contains("edit-btn") ||
        target.closest(".edit-btn")
      ) {
        noteTitleInput.value = note.title;
        noteContentTextarea.value = note.content;
        charCountSpan.textContent = `${note.content.length}/250 characters`;
        addEditNoteBtn.textContent = "Save Changes";
        editingNoteId = noteId;
        noteTitleInput.focus();
      }

      if (
        target.classList.contains("delete-btn") ||
        target.closest(".delete-btn")
      ) {
        showModal(
          "Confirm Deletion",
          `Are you sure you want to delete "${note.title}"? This action cannot be undone.`,
          "confirm",
          () => {
            notes = notes.filter((n) => n.id !== noteId);
            saveNotes();
            renderNotes();
            showModal("Success", "Note deleted successfully!", "success");
          }
        );
      }

      if (target.classList.contains("view-more-btn")) {
        const contentEl = noteItem.querySelector(".note-item-content");
        if (contentEl.classList.contains("expanded")) {
          contentEl.classList.remove("expanded");
          contentEl.textContent =
            note.content.substring(0, TRUNCATION_LENGTH) + "...";
          target.textContent = "View More";
        } else {
          contentEl.classList.add("expanded");
          contentEl.textContent = note.content;
          target.textContent = "View Less";
        }
      }
    });

    noteContentTextarea.addEventListener("input", () => {
      const length = noteContentTextarea.value.length;
      charCountSpan.textContent = `${length}/250 characters`;
      charCountSpan.style.color =
        length > 250 ? "var(--error-color)" : "var(--secondary-text-color)";
      addEditNoteBtn.disabled = length > 250;
    });

    loadNotes();
  }

  // === Registration Event Listeners ===
  if (registerBtn) registerBtn.addEventListener("click", openRegistrationModal);
  if (regCloseBtn) {
    regCloseBtn.addEventListener("click", closeRegistrationModal);
    registrationModalOverlay.addEventListener("click", (e) => {
      if (e.target === registrationModalOverlay) closeRegistrationModal();
    });
  }
  if (registrationForm)
    registrationForm.addEventListener("submit", handleRegistrationSubmit);

  // === Image Upload Module ===
  if (imageUploadInput) {
    const loadImages = () => {
      const stored = localStorage.getItem("adminx_images");
      if (stored) uploadedImages = JSON.parse(stored);
      renderImages();
    };

    const saveImages = () => {
      localStorage.setItem("adminx_images", JSON.stringify(uploadedImages));
    };

    const renderImages = () => {
      imageGallery.innerHTML = "";
      if (uploadedImages.length === 0) {
        imageGallery.innerHTML =
          '<p class="no-images-message">No images yet. Upload some above!</p>';
        return;
      }

      uploadedImages.forEach((image) => {
        const item = document.createElement("div");
        item.classList.add("gallery-item");
        item.dataset.id = image.id;
        item.innerHTML = `
        <img src="${image.data}" alt="${image.name || "Uploaded Image"}">
        <button class="delete-image-btn" title="Delete Image"><i class="fas fa-times"></i></button>
      `;
        imageGallery.appendChild(item);
      });
    };

    const handleFiles = (files) => {
      selectedFiles = [...files].filter((file) =>
        file.type.startsWith("image/")
      );
      uploadPreview.innerHTML = "";

      if (selectedFiles.length === 0) {
        uploadBtn.disabled = true;
        return;
      }

      uploadBtn.disabled = false;
      selectedFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const item = document.createElement("div");
          item.classList.add("upload-preview-item");
          item.innerHTML = `
          <img src="${e.target.result}" alt="${file.name}">
          <button class="remove-preview-btn" data-name="${file.name}">&times;</button>
        `;
          uploadPreview.appendChild(item);

          item
            .querySelector(".remove-preview-btn")
            .addEventListener("click", (event) => {
              const name = event.target.dataset.name;
              selectedFiles = selectedFiles.filter((f) => f.name !== name);
              item.remove();
              if (selectedFiles.length === 0) uploadBtn.disabled = true;
            });
        };
        reader.readAsDataURL(file);
      });
    };

    // Upload Triggers
    browseFilesBtn.addEventListener("click", () => imageUploadInput.click());
    imageUploadInput.addEventListener("change", (e) =>
      handleFiles(e.target.files)
    );

    // Drag & Drop
    dropArea.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropArea.classList.add("highlight");
    });

    dropArea.addEventListener("dragleave", () => {
      dropArea.classList.remove("highlight");
    });

    dropArea.addEventListener("drop", (e) => {
      e.preventDefault();
      dropArea.classList.remove("highlight");
      handleFiles(e.dataTransfer.files);
    });

    // Upload Button
    uploadBtn.addEventListener("click", () => {
      if (selectedFiles.length === 0) {
        showModal("Upload Error", "No images selected for upload.", "error");
        return;
      }

      let uploadedCount = 0;
      selectedFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          uploadedImages.unshift({
            id: Date.now() + Math.random(),
            name: file.name,
            data: e.target.result,
          });
          uploadedCount++;
          if (uploadedCount === selectedFiles.length) {
            saveImages();
            renderImages();
            showModal(
              "Upload Successful",
              `${uploadedCount} image(s) uploaded successfully!`,
              "success"
            );
            selectedFiles = [];
            uploadPreview.innerHTML = "";
            uploadBtn.disabled = true;
          }
        };
        reader.readAsDataURL(file);
      });
    });

    // Delete Image
    imageGallery.addEventListener("click", (e) => {
      const btn = e.target.closest(".delete-image-btn");
      if (!btn) return;

      const item = btn.closest(".gallery-item");
      const id = parseFloat(item.dataset.id);
      const image = uploadedImages.find((img) => img.id === id);

      if (image) {
        showModal(
          "Confirm Deletion",
          `Are you sure you want to delete "${image.name}"?`,
          "confirm",
          () => {
            uploadedImages = uploadedImages.filter((img) => img.id !== id);
            saveImages();
            renderImages();
            showModal("Success", "Image deleted successfully!", "success");
          }
        );
      }
    });

    // Load images on startup
    loadImages();
  }

  if (taskForm) {

    //  Updates the task counter displayed in the UI

    // function updateTaskCounter() {
    //   const totalTasks = taskList.children.length;
    //   taskCounter.textContent = totalTasks;
    // }

    /**
 * Handles adding a new task when the form is submitted
 */
    taskForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const taskText = taskInput.value.trim();
      if (taskText === "") return; // Ignore empty submissions

      const li = document.createElement("li");
      li.textContent = taskText;

      // Create Delete Button
      const deleteBtn = document.createElement("button");
      deleteBtn.innerHTML = `<i class="fas fa-trash"></i>`;
      deleteBtn.classList.add("delete-task-btn");
      deleteBtn.addEventListener("click", () => {
        li.remove();
        // updateTaskCounter();
      });

      // Append delete button to task item
      li.appendChild(deleteBtn);

      // Add task to list
      taskList.appendChild(li);

      // Clear input and update counter
      taskInput.value = "";
      // updateTaskCounter();
    });
  }


});
