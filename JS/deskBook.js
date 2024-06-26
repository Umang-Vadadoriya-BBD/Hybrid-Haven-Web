import {
  countBooking,
  getAllNeighbour,
  getBookingWithDate,
  tommorrowDate,
  GetAllEmployee,
  closeNav,
  getTomorrowDate,
  getEmployeeByName,
  TurnOnLoader,
  TurnOffLoader,
  formatDate2,
  fetchOptions,
  formatDate
} from "./common.js";
import { openModal } from "./modal.js";
import { API_RUN } from "./URLCollection.js";

var APIURL = API_RUN;
let neighbourhoodNamesById = {};
// Deskbooking Page

export async function deskBookigPage() {
  const rightPanel = document.getElementById("right-panel");
  const contentDiv = document.getElementById("content");
  const div = document.createElement("div");
  div.id = "content";
  const html = `
    <div id="deskpage" class="heading-Container">
      <h1 style="display:inline-block">WHO'S IN TOMORROW</h1>
    </div>
    <div id="main-show"><div></div></div>
  `;
  div.innerHTML = html;
  rightPanel.replaceChild(div, contentDiv);
  await loadDeskBooking();
  deskBookAdvance();
  closeNav();
}

function GetImagePerNeighbour(type) {
  switch (type) {
    case "Quite Space":
      return "./image/mute.png";
    case "Hot Desk":
      return "./image/man.png";
    case "Collab":
      return "./image/collaboration.png";
    default:
      return "";
  }
}

async function loadDeskBooking() {
  TurnOnLoader();
  const Bookings = await getBookingWithDate(tommorrowDate);
  const NeighbourHoods = await getAllNeighbour();
  const Employees = await GetAllEmployee();

  const contentDiv = document.getElementById("content");
  const old_mainShow = document.getElementById("main-show");
  const new_mainshow = document.createElement("div");
  new_mainshow.id = "main-show";

  let ele = document.createElement("div");
  ele.classList.add("desk-book");

  let booked = false;
  let bookedNeighbourHoodName;
  let bookedBookingID;

  let totalemp = {};

  let neiNames = [];

  let buttonFlag = ShouldShowButton(Bookings);
  console.log("Button", buttonFlag);

  NeighbourHoods.map((nei) => {
    let avail = 0;
    let arr = [];
    neiNames.push(nei.neighbourName);

    let neighbourhoodDiv = document.createElement("div");
    neighbourhoodDiv.classList.add("neighbourhood-div");

    let img = document.createElement("img");
    img.src = GetImagePerNeighbour(nei.neighbourName);
    img.alt = `${nei.neighbourName} Image`;
    img.classList.add("desk-img");
    neighbourhoodDiv.appendChild(img);

    let heading = document.createElement("h3");
    heading.textContent = nei.neighbourName;
    neighbourhoodDiv.appendChild(heading);

    avail = nei.neighbourNumberOfDesk;

    let innerElement = document.createElement("div");

    if (countBooking(nei.neighbourId, Bookings) > 0) {
      innerElement.classList.add("inner");
      innerElement.id = `${nei.neighbourName}-inner`;
      Bookings.map((booking) => {
        if (booking.neighbourId == nei.neighbourId) {
          Employees.map((emp) => {
            if (emp.employeeId == booking.employeeId) {
              if (localStorage.getItem("username") == emp.employeeName) {
                booked = true;
                bookedNeighbourHoodName = nei.neighbourName;
                bookedBookingID = booking.deskBookingId;
              }
              arr.push(emp.employeeName);
              let employeeNameElement = document.createElement("span");
              employeeNameElement.classList.add("name-tag");
              employeeNameElement.textContent = `${emp.employeeName}`;
              innerElement.appendChild(employeeNameElement);
              avail--;
            }
          });
        }
      });
    } else {
      innerElement.id = `${nei.neighbourName}-inner`;
      innerElement.style.fontStyle = "italic";

      innerElement.textContent = `No one booked the ${nei.neighbourName}`;
    }

    let name = nei.neighbourName;
    let neighbourId = nei.neighbourId;
    totalemp[name] = arr;
    neighbourhoodNamesById[neighbourId] = name;

    neighbourhoodDiv.appendChild(innerElement);

    let availTag = document.createElement("div");
    availTag.classList.add("avail-tag");
    availTag.textContent = `+${avail} Desks left`;
    neighbourhoodDiv.appendChild(availTag);

    if (avail > 0 && !booked && buttonFlag) {
      let joinButton = document.createElement("button");
      joinButton.id = `neighbourhood-${nei.neighbourName}`;
      joinButton.classList.add("join-btn");
      joinButton.textContent = "Join";
      joinButton.value = nei.neighbourId;
      joinButton.onclick = function () {
        joinDesk(
          joinButton.value,
          localStorage.getItem("username"),
          tommorrowDate
        );
      };
      neighbourhoodDiv.appendChild(joinButton);
    } else if (
      booked &&
      nei.neighbourName == bookedNeighbourHoodName
    ) {
      let cancelButton = document.createElement("button");
      cancelButton.id = `neighbourhood-${nei.neighbourName}`;
      cancelButton.classList.add("cancel-btn");
      cancelButton.textContent = "Cancel";
      cancelButton.value = bookedBookingID;
      cancelButton.onclick = function () {
        cancelDesk(cancelButton.value);
      };
      neighbourhoodDiv.appendChild(cancelButton);
    }
    ele.appendChild(neighbourhoodDiv);
  });
  new_mainshow.appendChild(ele);
  contentDiv.replaceChild(new_mainshow, old_mainShow);

  neiNames.map((nei) => {
    let classname = `${nei}-inner`;
    let total = document.getElementById(classname).children.length;
    let div = document.getElementById(classname);
    if (total > 3) {
      const hoverdiv = document.createElement("div");
      hoverdiv.id = "viewMore";
      hoverdiv.textContent = `+${total - 3} More ...`;
      hoverdiv.classList.add("view-more");
      hoverdiv.addEventListener("click", function () {
        deskHover(totalemp[nei], nei);
      });
      div.parentNode.insertBefore(hoverdiv, div.nextSibling);
    }
  });

  TurnOffLoader();
}

export function deskHover(data, type) {
  let parent = document.getElementById("emp-model");
  let heading = document.getElementById("view-heading");
  let old_div = document.getElementById("emplist");
  let employeeDiv = document.createElement("div");
  employeeDiv.id = "emplist";
  employeeDiv.classList.add("employee-list");
  const innerEmpDiv = document.createElement("div");
  innerEmpDiv.classList.add("inner-vac");

  let modal = document.getElementById("employeeModal");
  modal.style.display = "flex";

  heading.textContent = type;
  data.map((d) => {
    const employeeName = d;
    const empDiv = document.createElement("div");
    empDiv.style.padding = ".5em";
    empDiv.classList.add("name-tag");
    empDiv.textContent = `${employeeName} `;
    innerEmpDiv.appendChild(empDiv);
  });
  employeeDiv.appendChild(innerEmpDiv);
  parent.replaceChild(employeeDiv, old_div);
}

function joinDesk(type, name, date) {
  createDeskBooking(type, getTomorrowDate(), name, date);
}

function cancelDesk(deskBookingId) {
  cancelDeskBooking(deskBookingId);
}

function ShouldShowButton(Bookings) {
  const ID = localStorage.getItem("employeeId");
  let flag = true;
  Bookings.map((book) => {
    if (book.employeeId == ID) {
      flag= false;
    }
  });
  return flag;
}

async function createDeskBooking(
  neighbourId,
  deskBookingDate,
  name,
  tommorrowDate
) {
  const employees = await getEmployeeByName(name);
  const bookings = await getBookingWithDate(tommorrowDate);
  let employeeId;
  let flag = false;

  employees.map((employee) => {
    employeeId = employee.employeeId;
    bookings.map((booking) => {
      if (employee.employeeId === booking.employeeId) {
        flag = true;
        return;
      }
    });
  });

  if (!flag) {
    // // Construct the URL
    const url = `${APIURL}desk-bookings`;

    // Create the request body
    const requestBody = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        employeeId: employeeId,
        neighbourId: neighbourId,
        deskBookingDate: deskBookingDate,
      }),
    };

    // Send the POST request
    fetch(url, requestBody)
      .then((response) => {
        if (!response.ok) {
          openModal("Failed to create desk booking");
          throw new Error("Failed to create desk booking :(");
        }
        return response.json();
      })
      .then((data) => {
        openModal("Desk booking created successfully..!!");
        deskBookigPage();
      })
      .catch((error) => {
        console.error("Error creating desk booking :(", error);
      });
  }
}

async function cancelDeskBooking(deskBookingId) {
  // Construct the URL
  const url = `${APIURL}desk-bookings/id/${deskBookingId}`;

  // Create the request body
  const requestBody = {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      "Content-Type": "application/json",
    },
  };

  // Send the DELETE request
  fetch(url, requestBody)
    .then((response) => {
      if (!response.ok) {
        openModal("Failed to cancel desk booking");
        throw new Error("Failed to cancel desk booking :(");
      }
    })
    .then(() => {
      openModal("Sorry To See You Go..!!");
      deskBookigPage();
    })
    .catch((error) => {
      console.error("Error creating desk booking :(", error);
    });
}

// advance booking

function deskBookAdvance() {
  let deskpage = document.getElementById("deskpage");

  let div = document.createElement('div');
  div.style.display="flex";
  
  let summarybtn = document.createElement("button");
  summarybtn.id = "upcoming";
  summarybtn.textContent = "Upcomming Bookings";
  summarybtn.addEventListener("click", function () {
    openUpcomingModal();
  });
  
  let deskBtn = document.createElement("button");
  deskBtn.id = "deskBookingBtn";
  deskBtn.textContent = "Advance Book";
  deskBtn.addEventListener("click", function () {
    openDeskBookingModal();
  }); 

  div.appendChild(summarybtn);
  div.appendChild(deskBtn);
  
  deskpage.appendChild(div);
}

async function openDeskBookingModal() {
  TurnOnLoader();
  let parent = document.getElementById("emp-model");
  let heading = document.getElementById("view-heading");
  let old_div = document.getElementById("emplist");
  let employeeDiv = document.createElement("div");
  employeeDiv.id = "emplist";
  employeeDiv.classList.add("employee-list");
  const innerEmpDiv = document.createElement("div");
  innerEmpDiv.classList.add("inner-vac");

  let modal = document.getElementById("employeeModal");
  modal.style.display = "flex";
  heading.textContent = "Book Your Desk";

  let formcontainer = document.createElement("div");
  formcontainer.classList.add("form-container");

  const form = document.createElement("form");
  form.id = "bookingForm";

  const deskTypeLabel = document.createElement("label");
  deskTypeLabel.textContent = "NeighbourHood:";
  form.appendChild(deskTypeLabel);

  const deskTypeSelect = document.createElement("select");
  deskTypeSelect.id = "deskType";
  deskTypeSelect.name = "deskType";
  deskTypeSelect.required = true;
  form.appendChild(deskTypeSelect);

  let nei = await getAllNeighbour();
  nei.map((nei) => {
    const option = document.createElement("option");
    option.value = nei.neighbourId;
    option.textContent = nei.neighbourName;
    deskTypeSelect.appendChild(option);
  });

  const bookingDateLabel = document.createElement("label");
  bookingDateLabel.textContent = "Booking Date:";
  form.appendChild(bookingDateLabel);

  const bookingDateInput = document.createElement("input");
  bookingDateInput.type = "date";
  bookingDateInput.id = "bookingDate";
  bookingDateInput.name = "bookingDate";
  bookingDateInput.required = true;
  form.appendChild(bookingDateInput);

  let tomorrow = getTomorrowDate();
  bookingDateInput.setAttribute("min", tomorrow);

  const submitButton = document.createElement("button");
  submitButton.type = "submit";
  submitButton.textContent = "Book Now";
  form.appendChild(submitButton);

  formcontainer.appendChild(form);
  innerEmpDiv.appendChild(formcontainer);

  employeeDiv.appendChild(innerEmpDiv);
  parent.replaceChild(employeeDiv, old_div);

  form.addEventListener("submit", async (event) => {
    event.preventDefault(); 
    const neighbour = deskTypeSelect.value;
    const joinDate = bookingDateInput.value;
    let empid = localStorage.getItem("employeeId");
    console.log(formatDate2(joinDate));

    let dbooked = false;
    let Deskbooking = await getBookingWithDate(formatDate2(joinDate));

    Deskbooking.map((desk) => {
      if (desk.employeeId == empid && desk.deskBookingDate == joinDate) {
        dbooked = true;
        return;
      }
    });

    if (!dbooked) {
      const url = `${APIURL}desk-bookings`;
      const requestBody = {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId: empid,
          neighbourId: neighbour,
          deskBookingDate: joinDate,
        }),
      };

      // Send the POST request
      fetch(url, requestBody)
        .then((response) => {
          if (!response.ok) {
            openModal("Failed to create desk booking");
            throw new Error("Failed to create desk booking :(");
          }
          return response.json();
        })
        .then((data) => {
          modal.style.display = "none";
          deskBookigPage();
          openModal("Desk booking created successfully..!!");
        })
        .catch((error) => {
          console.error("Error creating desk booking :(", error);
        });
    } else if (dbooked) {
      modal.style.display = "none";
      openModal("You already booked your Desk");
    }
  });
  TurnOffLoader();
}

async function openUpcomingModal(){
  let parent = document.getElementById("emp-model");
  let heading = document.getElementById("view-heading");
  let old_div = document.getElementById("emplist");
  let employeeDiv = document.createElement("div");
  employeeDiv.id = "emplist";
  employeeDiv.classList.add("employee-list");
  const innerEmpDiv = document.createElement("div");
  innerEmpDiv.classList.add("inner-vac");
  innerEmpDiv.id = "upcoming-div";

  const empId = localStorage.getItem('employeeId');

  let modal = document.getElementById("employeeModal");
  modal.style.display = "flex";
  heading.textContent = "Upcoming Bookings";

  fetchBookings(empId);

  employeeDiv.appendChild(innerEmpDiv);
  parent.replaceChild(employeeDiv, old_div);

}

async function fetchBookings(empId) {
  TurnOnLoader();
  const today = new Date();
  for (let i = 2; i <= 6; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const formattedDate = date.toISOString().split('T')[0];
      const fdate = formatDate2(formattedDate);
      await fetch(`${APIURL}desk-bookings/date/${fdate}`,fetchOptions)
          .then(response => response.json())
          .then(data => {
              data.forEach(booking => {
                  if (booking.employeeId == empId) {
                      displayBooking(booking);
                  }
              });
          })
          .catch(error => console.error('Error fetching bookings:', error));
  }
  TurnOffLoader();
}

function displayBooking(booking) {
  let div = document.getElementById("upcoming-div");
  const bookingDiv = document.createElement('div');
  bookingDiv.className = 'booking';

  const card = document.createElement('div');
  card.classList.add("upcoming-card");

  const dispDate = document.createElement('div');
  dispDate.classList.add("dispdate");
  dispDate.textContent = formatDate(booking.deskBookingDate);

  const dispNeiName = document.createElement('div');
  dispNeiName.classList.add("dispNeiName");
  dispNeiName.textContent = neighbourhoodNamesById[booking.neighbourId];

  const deleteBookingBtn = document.createElement("button");
  deleteBookingBtn.classList.add("deleteBookingBtn");
  deleteBookingBtn.textContent = " X "; 
  deleteBookingBtn.addEventListener("click",function(){
    deleteDeskbookingById(booking.deskBookingId);
  });

  card.appendChild(dispDate);
  card.appendChild(dispNeiName);
  card.appendChild(deleteBookingBtn);
  bookingDiv.appendChild(card);

  div.appendChild(bookingDiv);
}


function deleteDeskbookingById(id){
  // console.log(id);
  TurnOnLoader();
  let modal = document.getElementById("employeeModal");
  modal.style.display = "none";

  const url = `${APIURL}desk-bookings/id/${id}`;

  const requestBody = {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      "Content-Type": "application/json",
    },
  };

  fetch(url, requestBody)
    .then((response) => {
      if (!response.ok) {
        openModal("Failed To Cancel DeskBooking");
        throw new Error("Failed To Cancel DeskBooking");
      }
    })
    .then(() => {
      openModal("Sorry To See You Go..!!");
      deskBookigPage();
    })
    .catch((error) => {
      console.error("Error Deleting Deskbooking ", error);
    });
    TurnOffLoader();
}