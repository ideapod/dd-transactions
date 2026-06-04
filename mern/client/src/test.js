export default const schema = {
  fields: [
    {
      component: 'wizard',
      name: 'wizzard',
      fields: [
        {
          title: 'Get Started with DWRS Registration',
          name: 'step-getting-started',
          nextStep: 'step-registration-type',
          fields: [
            {
              component: 'plain-text',
              name: 'getting-started-header',
              label: 'Registration is voluntary and open to all Victorian disability workers.\nRegistration helps people with disability and their families choose a disability worker who is safe, skilled and professional'
            },
            {
              component: 'tabs',
              name: 'getting-started-tabs',
              fields: [
                {
                  name: 'before-you-start',
                  title: 'Before you start',
                  fields: [
                    {
                      component: 'plain-text',
                      name: 'bys-info',
                      label: 'How to register.\nTo apply youll need to: prove your identity, agree to national police check'
                    }
                  ]
                },
                {
                  name: 'how it works',
                  title: 'How it Works',
                  fields: [
                    {
                      component: 'plain-text',
                      name: 'hiw-info',
                      label: 'Proving Your Idnetity.\nYoulll need to prove your identity so we can make sure you are who you say you are. It also protects you from fraud'
                    }
                  ]
                }, 
                {
                  name: 'faq',
                  title: 'FAQ',
                  fields: [
                    {
                      component: 'plain-text',
                      name: 'faq-info',
                      label: 'Whats the difference betweeen an NDIS Worker screening clearance check and this?\nDisability worker eregistration is voluntary and only for victorian disability workers.'
                    }
                  ]
                } 
              ]
            }
          ]
        },
        {
          title: 'Registration Type',
          name: 'step-registration-type',
          nextStep: 'step-your-details',
          fields: [
            {
              component: 'plain-text',
              name: 'rego-choose-div',
              label: 'Choose Division\nChoose the division that best supports how you qualify for registration. You will need to provide more information and supporting documents.'
            },
            {
              component: 'radio',
              label: 'I want to register as:',
              name: 'opt-registration-type',
              options: [
                {
                  label: 'disability practitioner\nIhave one of the following: relevant tertiary qualification and experience, relevant professional registration',
                  value: 'disability practitioner'
                },
                {
                  label: 'disability support worker\nI have one of the following: relevant cert III, training, or at least 2 years experience',
                  value: 'disability support worker'
                } 
              ]
            },
          ]
        }, {
          title: 'Your Details',
          name: 'step-your-details',
          fields: [
            {
              component: 'text-field',
              label: 'First Name',
              name: 'first name'
            },
            {
              component: 'text-field',
              label: 'Email',
              name: 'email'
            },
            {
              component: 'text-field',
              label: 'Mobile Number',
              name: 'mobile number'
            }
          ]
        }
      ]
    }
  ]
}