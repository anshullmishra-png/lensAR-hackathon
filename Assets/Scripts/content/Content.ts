import type {ContentRoot} from "./ContentTypes"

/**
 * ALL user-facing text lives here. Fix a fact or a translation in this file only.
 * Hindi lines are drafts: `// HI: review` = needs a native-speaker check.
 * `VERIFY` = unconfirmed against a source; do not remove the flag until checked.
 */
export const Content: ContentRoot = {
  ui: {
    right: {en: "Right", hi: "सही"}, // HI: review
    notQuite: {en: "Not quite", hi: "ठीक नहीं"}, // HI: review
    levelOf: {en: "Level {n} of {total}", hi: "स्तर {n} / {total}"}, // HI: review
    next: {en: "Next", hi: "आगे"}, // HI: review
    skipDemo: {en: "Skip (demo)", hi: "छोड़ें (डेमो)"}, // HI: review
    lookFor: {en: "Look for", hi: "ध्यान से देखिए"} // HI: review
  },

  onboarding: {
    title: {en: "Meet Moti", hi: "मिलिए मोती से"}, // HI: review
    intro: {
      text: {
        en: "This is Moti. Dogs talk with their bodies. Let's learn to listen.",
        hi: "यह मोती है। कुत्ते अपने शरीर से बात करते हैं। चलो, सुनना सीखें।"
      },
      audioId: "onb_intro"
    },
    start: {en: "Start", hi: "शुरू करें"}
  },

  level1: {
    prompt: {en: "How is Moti feeling?", hi: "मोती कैसा महसूस कर रहा है?"},
    hint: {
      en: "Look at Moti's body, then pick one.",
      hi: "मोती के शरीर को देखिए, फिर एक चुनिए।" // HI: review
    },
    choices: [
      {id: "relaxed", label: {en: "Relaxed", hi: "शांत"}},
      {id: "nervous", label: {en: "Nervous", hi: "घबराया हुआ"}},
      {id: "warning", label: {en: "Warning", hi: "चेतावनी"}}
    ],
    items: [
      {
        id: "l1_a",
        pose: "relaxed",
        answer: "relaxed",
        // VERIFY: dog body-language signals against a vet / animal-welfare source
        explanation: {
          en: "Loose body, soft eyes, a relaxed closed mouth and a gentle wag mean Moti is calm.",
          hi: "ढीला शरीर, नरम आँखें, आराम से बंद मुँह और हल्की पूँछ हिलाना: मोती शांत है।" // HI: review
        },
        signals: [
          {id: "body", text: {en: "Loose body", hi: "ढीला शरीर"}},
          {id: "eyes", text: {en: "Soft eyes", hi: "नरम आँखें"}},
          {id: "mouth", text: {en: "Relaxed mouth", hi: "आराम से बंद मुँह"}},
          {id: "tail", text: {en: "Gentle wag", hi: "हल्की पूँछ हिलाना"}}
        ]
      },
      {
        id: "l1_b",
        pose: "nervous",
        answer: "nervous",
        // VERIFY: same source as l1_a
        explanation: {
          en: "Tail tucked, ears back, lip licking and yawning mean Moti is uneasy. Give space.",
          hi: "पूँछ दबी हुई, कान पीछे, होंठ चाटना और जम्हाई: मोती बेचैन है। उसे जगह दीजिए।" // HI: review
        },
        signals: [
          {id: "tail", text: {en: "Tail tucked", hi: "पूँछ दबी हुई"}},
          {id: "ears", text: {en: "Ears back", hi: "कान पीछे"}},
          {id: "mouth", text: {en: "Lip licking", hi: "होंठ चाटना"}},
          {id: "jaw", text: {en: "Yawning", hi: "जम्हाई"}}
        ]
      },
      {
        id: "l1_c",
        pose: "warning",
        answer: "warning",
        // VERIFY: same source as l1_a
        explanation: {
          en: 'Stiff body, hard stare, raised fur and showing teeth mean "stay away". Back off slowly.',
          hi: "अकड़ा शरीर, घूरती नज़र, खड़े बाल और दाँत दिखाना: मतलब \"दूर रहो\"। धीरे-धीरे पीछे हटिए।" // HI: review
        },
        signals: [
          {id: "body", text: {en: "Stiff body", hi: "अकड़ा शरीर"}},
          {id: "eyes", text: {en: "Hard stare", hi: "घूरती नज़र"}},
          {id: "fur", text: {en: "Raised fur", hi: "खड़े बाल"}},
          {id: "mouth", text: {en: "Showing teeth", hi: "दाँत दिखाना"}}
        ]
      }
    ]
  },

  // VERIFY: all four scenarios against a recognised dog-bite-prevention source.
  level2: {
    prompt: {en: "What do you do?", hi: "आप क्या करेंगे?"}, // HI: review
    items: [
      {
        id: "l2_eat",
        pose: "eating",
        props: ["bowl"],
        situation: {en: "Moti is eating.", hi: "मोती खाना खा रहा है।"}, // HI: review
        choices: [
          {id: "pet", correct: false, label: {en: "Pet him", hi: "उसे सहलाएँ"}},
          {
            id: "walk_past",
            correct: true,
            label: {en: "Walk past calmly, leave him alone", hi: "शांति से निकल जाएँ, उसे अकेला छोड़ दें"}
          },
          {id: "move_food", correct: false, label: {en: "Move his food", hi: "उसका खाना हटा दें"}}
        ],
        explanation: {
          en: "Dogs can guard food. Let them eat in peace.",
          hi: "कुत्ते अपने खाने की रखवाली करते हैं। उन्हें आराम से खाने दीजिए।" // HI: review
        }
      },
      {
        id: "l2_pups",
        pose: "with_puppies",
        props: ["puppies"],
        situation: {en: "Moti is with her puppies.", hi: "मोती अपने पिल्लों के साथ है।"}, // HI: review
        choices: [
          {id: "go_see", correct: false, label: {en: "Go see the puppies", hi: "पिल्लों को देखने जाएँ"}},
          {
            id: "keep_distance",
            correct: true,
            label: {en: "Keep your distance and walk away calmly", hi: "दूरी रखें और शांति से चले जाएँ"}
          }
        ],
        explanation: {
          en: "Mothers protect puppies. Admire them from far away.",
          hi: "माँ अपने पिल्लों की रक्षा करती है। उन्हें दूर से ही निहारिए।" // HI: review
        }
      },
      {
        id: "l2_sleep",
        pose: "sleeping",
        props: [],
        situation: {en: "Moti is asleep.", hi: "मोती सो रहा है।"}, // HI: review
        choices: [
          {id: "wake", correct: false, label: {en: "Wake him up to play", hi: "उसे खेलने के लिए जगाएँ"}},
          {
            id: "let_sleep",
            correct: true,
            label: {en: "Let him sleep and stay away", hi: "उसे सोने दें और दूर रहें"}
          }
        ],
        explanation: {
          en: "A startled dog may bite. Never wake a sleeping dog.",
          hi: "चौंका हुआ कुत्ता काट सकता है। सोते कुत्ते को कभी न जगाइए।" // HI: review
        }
      },
      {
        id: "l2_bark",
        pose: "barking",
        props: ["bark"],
        situation: {
          en: "Moti barks and comes toward you.",
          hi: "मोती भौंकता हुआ आपकी ओर आ रहा है।" // HI: review
        },
        choices: [
          {id: "run", correct: false, label: {en: "Run away", hi: "भाग जाएँ"}},
          {
            id: "stand_still",
            correct: true,
            label: {
              en: "Stand still, don't stare, then back away slowly",
              hi: "रुक जाएँ, घूरें नहीं, फिर धीरे-धीरे पीछे हटें"
            }
          },
          {id: "shout", correct: false, label: {en: "Shout and wave", hi: "चिल्लाएँ और हाथ हिलाएँ"}}
        ],
        explanation: {
          en: "Running makes dogs chase. Stand still like a tree, look away, then move off slowly.",
          hi: "भागने से कुत्ता पीछा करता है। पेड़ की तरह खड़े रहिए, नज़र फेर लीजिए, फिर धीरे से हट जाइए।" // HI: review
        }
      }
    ]
  },

  // VERIFY: every first-aid line below against India's National Rabies Control Programme guidance or WHO.
  // Safety rules: never judge whether a dog is rabid, never give a vaccine schedule or a dose count.
  level3: {
    title: {en: "If you are bitten", hi: "अगर कुत्ता काट ले"}, // HI: review
    intro: {
      text: {
        en: "If a dog bites or scratches you, act fast. Rabies can be prevented, but not cured.",
        hi: "अगर कुत्ता काटे या खरोंचे, तो तुरंत कदम उठाएँ। रेबीज़ से बचा जा सकता है, पर इलाज नहीं।" // VERIFY
      },
      audioId: "l3_intro"
    },
    wash: {
      id: "l3_wash",
      title: {en: "Step 1: Wash", hi: "पहला कदम: धोएँ"}, // HI: review
      text: {
        en: "Wash the wound right away with soap and running water for at least 15 minutes.",
        hi: "घाव को तुरंत साबुन और बहते पानी से कम से कम 15 मिनट तक धोएँ।" // HI: review. English matches the WHO rabies fact sheet ("at least 15 minutes")
      }
    },
    mythPrompt: {en: "Myth or fact?", hi: "मिथक या सच?"}, // HI: review
    mythLabel: {en: "Myth", hi: "मिथक"},
    factLabel: {en: "Fact", hi: "सच"},
    myths: [
      {
        id: "m_remedy",
        claim: {
          en: "Put chilli, turmeric or oil on the bite.",
          hi: "काटने की जगह पर मिर्च, हल्दी या तेल लगाएँ।" // HI: review
        },
        isMyth: true,
        explanation: {
          en: "Home remedies don't stop rabies and can harm the wound.",
          hi: "घरेलू नुस्खे रेबीज़ को नहीं रोकते और घाव को नुकसान पहुँचा सकते हैं।" // VERIFY
        }
      },
      {
        id: "m_scratch",
        claim: {
          en: "A small scratch doesn't need a doctor.",
          hi: "छोटी सी खरोंच के लिए डॉक्टर की ज़रूरत नहीं।" // HI: review
        },
        isMyth: true,
        explanation: {
          en: "Even scratches need to be checked at a health centre the same day.",
          hi: "खरोंच को भी उसी दिन स्वास्थ्य केंद्र में दिखाना चाहिए।" // VERIFY
        }
      },
      {
        id: "m_stomach",
        claim: {
          en: "Rabies vaccine means many painful injections in the stomach.",
          hi: "रेबीज़ के टीके का मतलब पेट में कई दर्दनाक इंजेक्शन।" // HI: review
        },
        isMyth: true,
        explanation: {
          en: "Modern rabies vaccines are not given in the stomach. Don't let fear stop you.",
          hi: "आज के रेबीज़ टीके पेट में नहीं लगते। डर को अपने रास्ते में मत आने दीजिए।" // VERIFY
        }
      }
    ],
    go: {
      id: "l3_go",
      title: {en: "Step 3: Go today", hi: "तीसरा कदम: आज ही जाएँ"}, // HI: review
      text: {
        en: "Go to the nearest health centre today for the anti-rabies vaccine.",
        hi: "आज ही नज़दीकी स्वास्थ्य केंद्र जाकर रेबीज़ का टीका लगवाएँ।" // VERIFY
      }
    },
    dose: {
      id: "l3_dose",
      title: {en: "Step 4: Every dose", hi: "चौथा कदम: हर डोज़"}, // HI: review
      text: {
        en: "Complete every dose on the dates the doctor gives. Never skip one.",
        hi: "डॉक्टर की बताई हर तारीख़ पर हर डोज़ पूरी करें। एक भी न छोड़ें।" // VERIFY
      }
    }
  },

  end: {
    title: {en: "Well done!", hi: "शाबाश!"}, // HI: review
    scoreLabel: {en: "Your score", hi: "आपका स्कोर"}, // HI: review
    levelLines: [
      {en: "Reading Moti's signals", hi: "मोती के संकेत पढ़ना"}, // HI: review
      {en: "Staying safe around dogs", hi: "कुत्तों के पास सुरक्षित रहना"}, // HI: review
      {en: "First aid if bitten", hi: "काटने पर प्राथमिक उपचार"} // HI: review
    ],
    closing: {
      text: {
        en: "Be kind to dogs. Vaccinate pet dogs. Never skip a dose.",
        hi: "कुत्तों से प्यार करें। पालतू कुत्तों को टीका लगवाएँ। कोई डोज़ न छोड़ें।"
      },
      audioId: "end_msg"
    },
    footer: {en: "Training aid only. Not medical advice.", hi: "केवल प्रशिक्षण के लिए। चिकित्सा सलाह नहीं।"},
    playAgain: {en: "Play again", hi: "फिर से खेलें"}
  }
}
