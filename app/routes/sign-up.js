const express = require('express')
const router = express.Router()
const organizations = require('../data/organizations.json')
const db = require('../db')

// Format organizations for the dropdown
const formattedOrganizations = organizations
  .filter(org => org.govuk_status === 'live') // Only show live organizations
  .map(org => ({
    value: org.analytics_identifier,
    text: org.title
  }))
  .sort((a, b) => a.text.localeCompare(b.text)) // Sort alphabetically

// Create a lookup map for organization names by code
const organizationMap = organizations.reduce((map, org) => {
  map[org.analytics_identifier] = org.title
  return map
}, {})

// GET sign-up page
router.get('/', (req, res) => {
  res.render('sign-up', {
    departments: formattedOrganizations,
    errors: null,
    errorList: null,
    data: req.session.data || {}
  })
})

// POST sign-up form
router.post('/', async (req, res) => {
  const errors = {}
  const errorList = []
  
  // Basic validation
  if (!req.body.firstName?.trim()) {
    errors.firstName = {
      text: "Enter your first name"
    }
    errorList.push({
      text: "Enter your first name",
      href: "#first-name"
    })
  }
  
  if (!req.body.lastName?.trim()) {
    errors.lastName = {
      text: "Enter your last name"
    }
    errorList.push({
      text: "Enter your last name",
      href: "#last-name"
    })
  }
  
  if (!req.body.email?.trim()) {
    errors.email = {
      text: "Enter your email address"
    }
    errorList.push({
      text: "Enter your email address",
      href: "#email"
    })
  } else if (!req.body.email.match(/.*\.gov\.uk$/)) {
    errors.email = {
      text: "Email must be a government email address ending in .gov.uk"
    }
    errorList.push({
      text: "Email must be a government email address ending in .gov.uk",
      href: "#email"
    })
  }
  
  if (!req.body.department) {
    errors.department = {
      text: "Select your department or organisation"
    }
    errorList.push({
      text: "Select your department or organisation",
      href: "#department"
    })
  }
  
  if (!req.body.justification?.trim()) {
    errors.justification = {
      text: "Explain why you need access"
    }
    errorList.push({
      text: "Explain why you need access",
      href: "#justification"
    })
  }

  if (Object.keys(errors).length > 0) {
    // Re-render form with errors
    return res.render('sign-up', {
      departments: formattedOrganizations,
      errors,
      errorList,
      errorMessage: true,
      data: req.body
    })
  }

  try {
    // Check if email already exists in registration_requests or users
    const existingRequest = await db('registration_requests')
      .where({
        email: req.body.email,
        status: 'pending'
      })
      .first()

    const existingUser = await db('users')
      .where('email', req.body.email)
      .first()

    if (existingRequest || existingUser) {
      errors.email = {
        text: "This email address is already registered or has a pending request"
      }
      errorList.push({
        text: "This email address is already registered or has a pending request",
        href: "#email"
      })
      return res.render('sign-up', {
        departments: formattedOrganizations,
        errors,
        errorList,
        errorMessage: true,
        data: req.body
      })
    }

    // Get department name from the map
    const departmentName = organizationMap[req.body.department]
    if (!departmentName) {
      throw new Error('Invalid department code')
    }

    // Create registration request
    await db('registration_requests').insert({
      first_name: req.body.firstName.trim(),
      last_name: req.body.lastName.trim(),
      email: req.body.email.trim(),
      department_code: req.body.department,
      department_name: departmentName,
      reason: req.body.justification.trim(),
      status: 'pending'
    })

    // Store form data in session
    req.session.data = req.body
    
    // Render success message
    res.render('sign-up', {
      departments: formattedOrganizations,
      success: true,
      data: req.body
    })
  } catch (error) {
    console.error('Error creating registration request:', error)
    
    // Show generic error message
    errors.generic = {
      text: "Sorry, there was a problem submitting your registration. Please try again."
    }
    errorList.push({
      text: "Sorry, there was a problem submitting your registration. Please try again.",
      href: "#"
    })
    
    res.render('sign-up', {
      departments: formattedOrganizations,
      errors,
      errorList,
      errorMessage: true,
      data: req.body
    })
  }
})

module.exports = router 