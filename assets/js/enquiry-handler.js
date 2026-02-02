/**
 * Enquiry Handler
 * Captures form submissions and saves them to Supabase enquiries table.
 */

import { supabase } from './supabase-client.js';

/**
 * Capture and save an enquiry
 * @param {Object} data - The data to save
 */
export async function saveEnquiry(data) {
    try {
        const { error } = await supabase
            .from('enquiries')
            .insert([
                {
                    type: data.type || 'general',
                    name: data.name || 'Anonymous',
                    email: data.email || null,
                    phone: data.phone || data.whatsapp || null,
                    service: data.service || null,
                    subject: data.subject || null,
                    message: data.message || null,
                    details: data.details || {},
                    status: 'new',
                    source_url: window.location.href
                }
            ]);

        if (error) {
            console.error('Error saving enquiry to Supabase:', error);
            return { success: false, error };
        }

        return { success: true };
    } catch (err) {
        console.error('Unexpected error in saveEnquiry:', err);
        return { success: false, error: err };
    }
}

/**
 * Auto-handler for forms
 * @param {string} formId - The ID of the form
 * @param {Object} options - Mapping options
 */
export function initEnquiryForm(formId, options = {}) {
    const form = document.getElementById(formId);
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        // We don't preventDefault here because existing forms might have their own handlers
        // or they might be submitting to external services like formsubmit.co or Google Apps Script.
        // We just want to capture the data as well.

        const formData = new FormData(form);
        const data = {};
        formData.forEach((value, key) => {
            data[key] = value;
        });

        // Map fields based on options
        const enquiryData = {
            type: options.type || 'enquiry',
            name: data[options.nameField || 'name'] || data['Full_Name'] || data['name'],
            email: data[options.emailField || 'email'] || data['Email'],
            phone: data[options.phoneField || 'phone'] || data['Phone_Number'] || data['whatsapp_number'] || data['whatsapp'],
            service: data[options.serviceField || 'service'] || data['Service_of_Interest'] || options.defaultService,
            subject: data[options.subjectField || 'subject'] || data['Project_Title'] || data['subject'],
            message: data[options.messageField || 'message'] || data['Message'] || data['message'],
            details: { ...data } // Store everything else in details
        };

        // Remove redundant fields from details
        delete enquiryData.details[options.nameField];
        delete enquiryData.details[options.emailField];
        delete enquiryData.details[options.phoneField];
        delete enquiryData.details[options.serviceField];
        delete enquiryData.details[options.subjectField];
        delete enquiryData.details[options.messageField];

        await saveEnquiry(enquiryData);
    });
}
