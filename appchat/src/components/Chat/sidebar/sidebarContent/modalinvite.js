
import React from 'react';


function ModalInvite() {

    return (
        <div
            aria-hidden="true"
            aria-labelledby="modal-invite"
            className="modal fade"
            id="modal-invite"
            tabIndex="-1"
        >
        <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
                <div className="profile text-center">
                    <div className="profile-img text-primary px-5">
                        <svg
                            fill="currentColor"
                            viewBox="0 0 300 100"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <defs>
                                <style
                                    dangerouslySetInnerHTML={{
                                        __html: '.st1 {fill: #fff;opacity: 0.1;}'
                                    }}
                                />
                            </defs>
                            <path d="M300,0v80c0,11-9,20-20,20H20C9,100,0,91,0,80V0H300z"/>
                            <path
                                className="st1"
                                d="M50,71c-16,0-29,13-29,29h10c0-10.5,8.5-19,19-19s19,8.5,19,19h10C79,84,66,71,50,71z"
                            />
                            <path
                                className="st1"
                                d="M31.6,0H21.3C21.8,1.6,22,3.3,22,5c0,10.5-8.5,19-19,19c-1,0-2-0.1-3-0.2v10.1C1,34,2,34,3,34c16,0,29-13,29-29                                                                                                C32,3.3,31.8,1.6,31.6,0z"
                            />
                            <path
                                className="st1"
                                d="M238.5,58C217.3,58,200,75.3,200,96.5c0,1.2,0,2.3,0.2,3.5h10.1c-0.1-1.2-0.2-2.3-0.2-3.5                                                                                                c0-15.7,12.8-28.5,28.5-28.5S267,80.8,267,96.5c0,1.2-0.1,2.3-0.2,3.5h10.1c0.1-1.2,0.2-2.3,0.2-3.5C277,75.3,259.7,58,238.5,58z"
                            />
                            <path
                                className="st1"
                                d="M299,22c-11,0-20-9-20-20c0-0.7,0-1.3,0.1-2h-10C269,0.7,269,1.3,269,2c0,16.5,13.5,30,30,30c0.3,0,0.7,0,1,0                                                                                                V22C299.7,22,299.3,22,299,22z"
                            />
                        </svg>
                    </div>
                    <div className="profile-content">
                        <div className="avatar avatar-lg">
              <span className="avatar-label bg-success text-white fs-3">
                <i className="ri-user-add-line"/>
              </span>
                        </div>
                        <h5 className="m-1">
                            Invite your friends
                        </h5>
                        <p className="text-muted">
                            Send invitations to one or more friends{' '}
                        </p>
                    </div>
                </div>
                <div className="modal-body p-4">
                    <div className="mb-4">
                        <label
                            className="form-label text-muted"
                            htmlFor="email-input-1"
                        >
                            E-mail address
                        </label>
                        <input
                            className="form-control form-control-lg form-control-solid"
                            id="email-input-1"
                            placeholder="name@example.com"
                            type="email"
                        />
                    </div>
                    <div>
                        <label
                            className="form-label text-muted"
                            htmlFor="textarea-input-1"
                        >
                            Message
                        </label>
                        <textarea
                            className="form-control form-control-lg form-control-solid"
                            id="textarea-input-1"
                            placeholder="Message for your friends"
                            rows="3"
                        />
                    </div>
                </div>
                <div className="modal-footer">
                    <button
                        className="btn btn-secondary"
                        data-bs-dismiss="modal"
                        type="button"
                    >
                        Close
                    </button>
                    <button
                        className="btn btn-primary"
                        type="button"
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
        </div>
    )
}

export default ModalInvite;