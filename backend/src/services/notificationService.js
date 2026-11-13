const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { config } = require('../config');

let snsClient = null;
try {
  snsClient = new SNSClient({ region: config.aws.region });
} catch (err) {
  console.warn('[SNS] Initialization warning:', err.message);
}

/**
 * Publishes an incident notification to Amazon SNS
 * @param {Object} incident - Incident details
 */
async function notifyNewIncident(incident) {
  const isHighSeverity = ['High', 'Critical'].includes(incident.severity);

  const subject = `[AquaAlert ${incident.severity.toUpperCase()}] Incident Reported: ${incident.incident_id} (${incident.issue_type})`;

  const message = [
    `=== AquaAlert Water Supply Disruption Alert ===`,
    `Incident ID: ${incident.incident_id}`,
    `Severity: ${incident.severity}`,
    `Issue Type: ${incident.issue_type}`,
    `Area / Locality: ${incident.area}`,
    `Reported At: ${new Date().toISOString()}`,
    ``,
    `Description:`,
    incident.description,
    ``,
    isHighSeverity ? `*** ATTENTION: High priority action required by municipal response team. ***\n` : '',
    `Admin Portal: Access the AquaAlert dashboard to review and assign action.`
  ].join('\n');

  // If SNS is not enabled in config, simulate notification in console
  if (!config.aws.enableSns || !config.aws.snsTopicArn) {
    console.log(`[SNS Simulation] Notification prepared for incident ${incident.incident_id}:`);
    console.log(`Subject: ${subject}`);
    return { success: true, simulated: true };
  }

  try {
    const command = new PublishCommand({
      TopicArn: config.aws.snsTopicArn,
      Subject: subject.slice(0, 100), // SNS subject max 100 characters
      Message: message,
      MessageAttributes: {
        severity: {
          DataType: 'String',
          StringValue: incident.severity
        },
        issue_type: {
          DataType: 'String',
          StringValue: incident.issue_type
        }
      }
    });

    const response = await snsClient.send(command);
    console.log(`[SNS] Notification successfully published. MessageId: ${response.MessageId}`);
    return { success: true, messageId: response.MessageId };
  } catch (err) {
    console.error('[SNS Error] Failed to publish notification to SNS:', err.message);
    // Don't fail the incident submission if notification fails
    return { success: false, error: err.message };
  }
}

module.exports = {
  notifyNewIncident
};

