"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useUser } from "@/app/context/UserContext"
import SessionTimeoutModal from "@/app/components/SessionTimeoutModal"
import {
    SESSION_TIMEOUT,
    SESSION_WARNING,
} from "@/lib/config"


const STORAGE_KEY = "crm_session_activity"


export default function SessionTimeout() {

    const router = useRouter()

    const { user, loading } = useUser()


    const expiresAt = useRef<number | null>(null)

    const countdown = useRef<NodeJS.Timeout | null>(null)

    const [showModal, setShowModal] = useState(false)

    const [seconds, setSeconds] = useState(
        Math.floor(SESSION_WARNING / 1000)
    )

    const loggingOut = useRef(false)



    const clearTimers = () => {

        if (countdown.current) {
            clearInterval(countdown.current)
            countdown.current = null
        }

    }



    const logout = async () => {

        if (loggingOut.current) return

        loggingOut.current = true

        clearTimers()

        localStorage.removeItem(STORAGE_KEY)

        await supabase.auth.signOut()

        router.replace("/login")

    }



    const startWarning = () => {
        if (showModal) return

        setShowModal(true)

        setSeconds(Math.floor(SESSION_WARNING / 1000))

        clearTimers()

        countdown.current = setInterval(() => {

            setSeconds((prev) => {

                if (prev <= 1) {
                    clearTimers()
                    logout()
                    return 0
                }

                return prev - 1
            })

        }, 1000)
    }



    const resetSession = () => {


        if (showModal) return


        expiresAt.current =
            Date.now() +
            SESSION_TIMEOUT


        localStorage.setItem(
            STORAGE_KEY,
            expiresAt.current.toString()
        )

    }



    const continueWorking = () => {

        setShowModal(false)

        clearTimers()

        resetSession()

    }



    useEffect(() => {


        if (loading || !user) {
            return
        }



        const checkExpiration = () => {


            if (!expiresAt.current) {
                return
            }


            const remaining =
                expiresAt.current -
                Date.now()



            if (
                remaining <= SESSION_WARNING
                &&
                remaining > 0
            ) {

                startWarning()

            }


            if (remaining <= 0) {

                logout()

            }

        }



        const events = [
            "mousemove",
            "mousedown",
            "keydown",
            "scroll",
            "touchstart",
            "click",
        ]



        const activity = () => {

            if (!showModal) {
                resetSession()
            }

        }



        events.forEach(event => {
            window.addEventListener(
                event,
                activity
            )
        })



        const saved =
            localStorage.getItem(
                STORAGE_KEY
            )


        if (saved) {

            expiresAt.current =
                Number(saved)

        } else {

            resetSession()

        }
        console.log(
            "Expira:",
            new Date(expiresAt.current!)
        )

        const interval =
            setInterval(
                checkExpiration,
                1000
            )



        const storageListener =
            (event: StorageEvent) => {


                if (
                    event.key !== STORAGE_KEY
                    ||
                    !event.newValue
                ) {
                    return
                }


                expiresAt.current =
                    Number(event.newValue)


                setShowModal(false)

            }



        window.addEventListener(
            "storage",
            storageListener
        )



        return () => {


            events.forEach(event => {

                window.removeEventListener(
                    event,
                    activity
                )

            })


            window.removeEventListener(
                "storage",
                storageListener
            )


            clearInterval(interval)

            clearTimers()

        }



    }, [loading, user])



    if (!showModal) {
        return null
    }



    return (
        <SessionTimeoutModal
            seconds={seconds}
            onContinue={continueWorking}
            onLogout={logout}
        />
    )
}