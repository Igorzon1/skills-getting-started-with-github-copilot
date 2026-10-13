document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  function showMessage(message, className) {
    messageDiv.textContent = message;
    messageDiv.className = className;
    messageDiv.classList.remove("hidden");
    setTimeout(() => messageDiv.classList.add("hidden"), 5000);
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.length = 1;

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> <span class="activity-availability">${spotsLeft} spots left</span></p>
        `;

        const participantsSection = document.createElement("div");
        participantsSection.className = "participants-section";

        const participantsHeading = document.createElement("h5");
        const participantsList = document.createElement("ul");
        participantsList.className = "participants-list";

        function renderParticipants() {
          participantsHeading.textContent = `Participants (${details.participants.length})`;
          participantsList.replaceChildren();

          details.participants.forEach((email) => {
            const participant = document.createElement("li");
            const participantEmail = document.createElement("span");
            participantEmail.className = "participant-email";
            participantEmail.textContent = email;

            const removeButton = document.createElement("button");
            removeButton.type = "button";
            removeButton.className = "remove-participant";
            removeButton.setAttribute("aria-label", `Remove ${email} from ${name}`);
            removeButton.title = "Remove participant";
            removeButton.innerHTML = '<span aria-hidden="true">&#215;</span>';
            removeButton.addEventListener("click", async (event) => {
              event.preventDefault();
              event.stopPropagation();
              removeButton.disabled = true;

              try {
                const response = await fetch(
                  `/activities/${encodeURIComponent(name)}/signup?email=${encodeURIComponent(email)}`,
                  { method: "DELETE" }
                );
                const result = await response.json();

                if (!response.ok) {
                  removeButton.disabled = false;
                  showMessage(result.detail || "Could not remove participant.", "error");
                  return;
                }

                const participantIndex = details.participants.indexOf(email);
                if (participantIndex !== -1) {
                  details.participants.splice(participantIndex, 1);
                }
                activityCard.querySelector(".activity-availability").textContent =
                  `${details.max_participants - details.participants.length} spots left`;
                renderParticipants();
                showMessage(result.message, "success");
              } catch (error) {
                removeButton.disabled = false;
                showMessage("Failed to remove participant. Please try again.", "error");
                console.error("Error removing participant:", error);
              }
            });

            participant.append(participantEmail, removeButton);
            participantsList.appendChild(participant);
          });

          participantsSection.replaceChildren(participantsHeading);
          if (details.participants.length === 0) {
            const emptyMessage = document.createElement("p");
            emptyMessage.className = "no-participants";
            emptyMessage.textContent = "No participants yet";
            participantsSection.appendChild(emptyMessage);
          } else {
            participantsSection.appendChild(participantsList);
          }
        }

        renderParticipants();

        activityCard.appendChild(participantsSection);

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
