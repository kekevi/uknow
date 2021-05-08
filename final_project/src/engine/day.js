/**
 * Days hold notes through "blocks" (ie. events but the term events is
 * taken by AJAX). 
 */

class Day {

    /**
     * A resource manager for holding the data of a Day.
     * @param {Date} date a JS Date object of the day this object represents
     * @param {Array} blocks optional - an array of blocks you want to initialize
     */
    constructor(date, notes) {
        this.date = date;
    }

    json() {
        return {
            date: this.date,
            day: this.day = dayNames[date.getDay()],
            month: monthNames[date.getMonth()]
        }
    }
}

Day.prototype.dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
Day.prototype.monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];