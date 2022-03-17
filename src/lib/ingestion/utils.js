/**
 * Check if the event is scheduled or not
 * @param {*} event 
 */
function isScheduledEvent (event) {
    return (
        event.source === 'aws.events' && 
        event['detail-type'].toLowerCase().indexOf('scheduled') !== -1
    )
}


module.exports = {
    isScheduledEvent,
}