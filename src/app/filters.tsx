// TypeScript filter classes for Chords
// Made with <3 at Upside Down labs
// Author: Aman Maheshwari
//
// Reference:
// https://docs.scipy.org/doc/scipy/reference/generated/scipy.signal.butter.html
// https://courses.ideate.cmu.edu/16-223/f2020/Arduino/FilterDemos/filter_gen.py
//
// Note:
// filter_gen.py provides C/C++ type functions which we have converted to TS

//Notch Filter 50Hz/60Hz
export class EXGFilter {
    // Properties to hold the state of the filter
    private z1: number;
    private z2: number;
    private x1: number;
    private x2: number;
    private x3: number;
    private x4: number;
    private currentSamplingRate: number;


    constructor() {
        // Initialize state variables
        this.z1 = 0;
        this.z2 = 0;
        this.x1 = 0;
        this.x2 = 0;
        this.x3 = 0;
        this.x4 = 0;
        this.currentSamplingRate = 0;
    }
    //bits-
    //1.500 
    //2.250
    //TYPE-
    //1.ECG
    //2.EOG
    //3.EEG
    //4.EMG
    // function to apply the 
    setbits( currentSamplingRate: number): void {
        this.currentSamplingRate = currentSamplingRate;
    }

    process(input: number, type: number): number {
        if (!type) return input;
        let output = input;
        let chData = 0;
        switch (this.currentSamplingRate) {
            //bitsrate 500Hz
            case 2000:
                switch (type) {
                    case 1: // ECG Sampling rate: 500.0 Hz, frequency: 30.0 Hz.
                        // Filter is order 2, implemented as second-order sections (biquads).
                        this.x1 = output - (-1.86689228 * this.z1) - (0.87521455 * this.z2);
                        output = 0.00208057 * this.x1 + 0.00416113 * this.z1 + 0.00208057 * this.z2;
                        this.z2 = this.z1;
                        this.z1 = this.x1;
                        break;
                    case 2: // EOG Sampling rate: 500.0 Hz, frequency: 10.0 Hz.
                        // Filter is order 2, implemented as second-order sections (biquads).
                        this.x2 = output - (-1.95557824 * this.z1) - (0.95654368 * this.z2);
                        output = 0.00024136 * this.x2 + 0.00048272 * this.z1 + 0.00024136 * this.z2;
                        this.z2 = this.z1;
                        this.z1 = this.x2;
                        break;
                    case 3: // EEG Sampling rate: 500.0 Hz, frequency: 45.0 Hz.
                        // Filter is order 2, implemented as second-order sections (biquads).
                        this.x3 = output - (-1.80064506 * this.z1) - (0.81878993 * this.z2);
                        output = 0.00453622 * this.x3 + 0.00907244 * this.z1 + 0.00453622 * this.z2;
                        this.z2 = this.z1;
                        this.z1 = this.x3;
                        break;
                    case 4: // EMG Sampling rate: 500.0 Hz, frequency: 70.0 Hz.
                        // Filter is order 2, implemented as second-order sections (biquads).
                        this.x4 = output - (-1.69099638 * this.z1) - (0.73272603 * this.z2);
                        output = 0.85593060 * this.x4 + -1.71186120 * this.z1 + 0.85593060 * this.z2;
                        this.z2 = this.z1;
                        this.z1 = this.x4;
                        break;
                    default:
                        break;
                }
                break;
            case 1000:
                switch (type) {
                    case 1: // ECG Sampling rate: 500.0 Hz, frequency: 30.0 Hz.
                        // Filter is order 2, implemented as second-order sections (biquads).
                        this.x1 = output - (-1.73472577 * this.z1) - (0.76600660 * this.z2);
                        output = 0.00782021 * this.x1 + 0.01564042 * this.z1 + 0.00782021 * this.z2;
                        this.z2 = this.z1;
                        this.z1 = this.x1;
                        break;
                    case 2: // EOG Sampling rate: 500.0 Hz, frequency: 10.0 Hz.
                        // Filter is order 2, implemented as second-order sections (biquads).
                        this.x2 = output - (-1.91119707 * this.z1) - (0.91497583 * this.z2);
                        output = 0.00094469 * this.x2 + 0.00188938 * this.z1 + 0.00094469 * this.z2;
                        this.z2 = this.z1;
                        this.z1 = this.x2;
                        break;
                    case 3: // EEG Sampling rate: 500.0 Hz, frequency: 45.0 Hz.
                        // Filter is order 2, implemented as second-order sections (biquads).
                        this.x3 = output - (-1.60413018 * this.z1) - (0.67045791 * this.z2);
                        output = 0.01658193 * this.x3 + 0.03316386 * this.z1 + 0.01658193 * this.z2;
                        this.z2 = this.z1;
                        this.z1 = this.x3;
                        break;
                    case 4: // EMG Sampling rate: 500.0 Hz, frequency: 70.0 Hz.
                        // Filter is order 2, implemented as second-order sections (biquads).
                        this.x4 = output - (-1.39089528 * this.z1) - (0.53719462 * this.z2);
                        output = 0.73202248 * this.x4 + -1.46404495 * this.z1 + 0.73202248 * this.z2;
                        this.z2 = this.z1;
                        this.z1 = this.x4;
                        break;
                    default:
                        break;
                }
                break;
            case 500:
                switch (type) {
                    case 1: // ECG Sampling rate: 500.0 Hz, frequency: 30.0 Hz.
                        // Filter is order 2, implemented as second-order sections (biquads).
                        this.x1 = output - (-1.47548044 * this.z1) - (0.58691951 * this.z2);
                        output = 0.02785977 * this.x1 + 0.05571953 * this.z1 + 0.02785977 * this.z2;
                        this.z2 = this.z1;
                        this.z1 = this.x1;
                        break;
                    case 2: // EOG Sampling rate: 500.0 Hz, frequency: 10.0 Hz.
                        // Filter is order 2, implemented as second-order sections (biquads).
                        this.x2 = output - (-1.82269493 * this.z1) - (0.83718165 * this.z2);
                        output = 0.00362168 * this.x2 + 0.00724336 * this.z1 + 0.00362168 * this.z2;
                        this.z2 = this.z1;
                        this.z1 = this.x2;
                        break;
                    case 3: // EEG Sampling rate: 500.0 Hz, frequency: 45.0 Hz.
                        // Filter is order 2, implemented as second-order sections (biquads).
                        this.x3 = output - (-0.51930341 * this.z1) - (0.21965398 * this.z2);
                        output = 0.17508764 * this.x3 + 0.35017529 * this.z1 + 0.17508764 * this.z2;
                        this.z2 = this.z1;
                        this.z1 = this.x3;
                        break;
                    case 4: // EMG Sampling rate: 500.0 Hz, frequency: 70.0 Hz.
                        // Filter is order 2, implemented as second-order sections (biquads).
                        this.x4 = output - (-0.82523238 * this.z1) - (0.29463653 * this.z2);
                        output = 0.52996723 * this.x4 + -1.05993445 * this.z1 + 0.52996723 * this.z2;
                        this.z2 = this.z1;
                        this.z1 = this.x4;
                        break;
                    default:
                        break;
                }
                break;
            case 250:
                //bitsrate 250Hz
                switch (type) {
                    case 1: // ECG Sampling rate: 250.0 Hz, frequency: 30.0 Hz.
                        // Filter is order 2, implemented as second-order sections (biquads).
                        this.x1 = output - -0.98240579 * this.z1 - 0.34766539 * this.z2;
                        output = 0.09131490 * this.x1 + 0.18262980 * this.z1 + 0.09131490 * this.z2;
                        this.z2 = this.z1;
                        this.z1 = this.x1;
                        break;

                    case 2: // EOG Sampling rate: 250.0 Hz, frequency: 10.0 Hz.
                        // Filter is order 2, implemented as second-order sections (biquads).
                        this.x2 = output - -1.64745998 * this.z1 - 0.70089678 * this.z2;
                        output = 0.01335920 * this.x2 + 0.02671840 * this.z1 + 0.01335920 * this.z2;
                        this.z2 = this.z1;
                        this.z1 = this.x2;
                        break;

                    case 3: // EEG Sampling rate: 250.0 Hz, frequency: 45.0 Hz.
                        // Filter is order 2, implemented as second-order sections (biquads).
                        this.x3 = output - -0.51930341 * this.z1 - 0.21965398 * this.z2;
                        output = 0.17508764 * this.x3 + 0.35017529 * this.z1 + 0.17508764 * this.z2;
                        this.z2 = this.z1;
                        this.z1 = this.x3;
                        break;

                    case 4: // EMG Sampling rate: 250.0 Hz, frequency: 70.0 Hz.
                        // Filter is order 2, implemented as second-order sections (biquads).
                        this.x4 = output - 0.22115344 * this.z1 - 0.18023207 * this.z2;
                        output = 0.23976966 * this.x4 + -0.47953932 * this.z1 + 0.23976966 * this.z2;
                        this.z2 = this.z1;
                        this.z1 = this.x4;
                        break;

                    default:
                        break;
                }
                break;
            default:
                break;
        }
        return output;
    }
}

export class five {
    // Properties to hold the state of the filter
    private z1: number;
    private z2: number;
    private x1: number;
    private currentSamplingRate: number;

    constructor() {
        // Initialize state variables
        this.z1 = 0;
        this.z2 = 0;
        this.x1 = 0;
        this.currentSamplingRate = 0;
    }
    setbits(currentSamplingRate: number): void {
        this.currentSamplingRate = currentSamplingRate;
    }
    process(input: number): number {
        let output = input;
        switch (this.currentSamplingRate) {
        case 2000:
            this.x1 = output - (-1.99777856 * this.z1) - (0.99778102 * this.z2);
            output = 0.99888990 * this.x1 + (-1.99777979 * this.z1) + 0.99888990 * this.z2;
            this.z2 = this.z1;
            this.z1 = this.x1;
            break;
        case 1000:
            this.x1 = output - (-1.99555712 * this.z1) - (0.99556697 * this.z2);
            output = 0.99778102 * this.x1 + (-1.99556205 * this.z1) + 0.99778102 * this.z2;
            this.z2 = this.z1;
            this.z1 = this.x1;
            break;
        case 500:
            this.x1 = output - (-1.99111429 * this.z1) - (0.99115360 * this.z2);
            output = 0.99556697 * this.x1 + (-1.99113394  * this.z1) + 0.99556697 * this.z2;
            this.z2 = this.z1;
            this.z1 = this.x1;
            break;           
        case 250:
            this.x1 = output - (-1.98222893 * this.z1) - (0.98238545 * this.z2);
            output = 0.99115360 * this.x1 + (-1.98230719 * this.z1) + 0.99115360 * this.z2;
            this.z2 = this.z1;
            this.z1 = this.x1;
            break;
        default:
            break;
        }
        return output;
    
    }
}
export class Notch {
    // Properties to hold the state of the filter sections
    private z1_1: number;
    private z2_1: number;
    private z1_2: number;
    private z2_2: number;
    private x_1: number;
    private x_2: number;
    private currentSamplingRate: number;


    constructor() {
        // Initialize state variables for both filter sections
        this.z1_1 = 0;
        this.z2_1 = 0;
        this.z1_2 = 0;
        this.z2_2 = 0;
        this.x_1 = 0;
        this.x_2 = 0;
        this.currentSamplingRate = 0;

    }

    setbits(currentSamplingRate: number): void {
        this.currentSamplingRate = currentSamplingRate;
    }

    // Method to apply the filter
    process(input: number, type: number): number {
        if (!type) return input;
        let output = input;
        switch (this.currentSamplingRate) {
            case 2000:   // 500Hz
                switch (type) {
                    case 1: // Notch Sampling rate: 2000.0 Hz, frequency: [48.0, 52.0] Hz.
                        this.x_1 = output - (-1.96501124 * this.z1_1) - (0.99090637 * this.z2_1);
                        output = 0.99115360  * this.x_1 + -1.95794035  * this.z1_1 + 0.99115360  * this.z2_1;
                        this.z2_1 = this.z1_1;
                        this.z1_1 = this.x_1;
                        // Second filter section
                        this.x_2 = output - (-1.96826749  * this.z1_2) - (0.99140088 * this.z2_2);
                        output = 1.00000000 * this.x_2 + -1.97541567  * this.z1_2 + 1.00000000 * this.z2_2;
                        this.z2_2 = this.z1_2;
                        this.z1_2 = this.x_2;
                        break;
                    case 2: // Notch Sampling rate: 2000.0 Hz, frequency: [58.0, 62.0] Hz.
                        this.x_1 = output - (-1.95402567 * this.z1_1) - (0.99094837  * this.z2_1);
                        output = 0.99115360 * this.x_1 + (-1.94723352 * this.z1_1) + (0.99115360 * this.z2_1);
                        this.z2_1 = this.z1_1;
                        this.z1_1 = this.x_1;
                        // Second filter section
                        this.x_2 = output - (-1.95774425 * this.z1_2) - ( 0.99135886 * this.z2_2);
                        output = 1.00000000 * this.x_2 + (-1.96461328 * this.z1_2) + (1.00000000 * this.z2_2);
                        this.z2_2 = this.z1_2;
                        this.z1_2 = this.x_2;
                        break;
                    default:
                        break;
                }
                break;
            case 1000:   // 500Hz
                switch (type) {
                    case 1: // Notch Sampling rate: 1000.0 Hz, frequency: [48.0, 52.0] Hz.
                        this.x_1 = output - (-1.87946376 * this.z1_1) - (0.98190767 * this.z2_1);
                        output = 0.98238544  * this.x_1 + -1.86875569 * this.z1_1 + 0.98238544  * this.z2_1;
                        this.z2_1 = this.z1_1;
                        this.z1_1 = this.x_1;
                        // Second filter section
                        this.x_2 = output - (-1.89126003 * this.z1_2) - (0.98286346 * this.z2_2);
                        output = 1.00000000 * this.x_2 + -1.90226323  * this.z1_2 + 1.00000000 * this.z2_2;
                        this.z2_2 = this.z1_2;
                        this.z1_2 = this.x_2;
                        break;
                    case 2: // Notch Sampling rate: 1000.0 Hz, frequency: [58.0, 62.0] Hz.
                        this.x_1 = output - (-1.83632723 * this.z1_1) - (0.98199344  * this.z2_1);
                        output = 0.98238544 * this.x_1 + (-1.82694201 * this.z1_1) + (0.98238544 * this.z2_1);
                        this.z2_1 = this.z1_1;
                        this.z1_1 = this.x_1;
                        // Second filter section
                        this.x_2 = output - (-1.85002606 * this.z1_2) - (0.98277762 * this.z2_2);
                        output = 1.00000000 * this.x_2 + (-1.85969981 * this.z1_2) + (1.00000000 * this.z2_2);
                        this.z2_2 = this.z1_2;
                        this.z1_2 = this.x_2;
                        break;
                    default:
                        break;
                }
                break;
            case 500:   // 500Hz
                switch (type) {
                    case 1: // Notch Sampling rate: 500.0 Hz, frequency: [48.0, 52.0] Hz.
                        this.x_1 = output - (-1.56858163 * this.z1_1) - (0.96424138 * this.z2_1);
                        output = 0.96508099 * this.x_1 + -1.56202714 * this.z1_1 + 0.96508099 * this.z2_1;
                        this.z2_1 = this.z1_1;
                        this.z1_1 = this.x_1;
                        // Second filter section
                        this.x_2 = output - (-1.61100358 * this.z1_2) - (0.96592171 * this.z2_2);
                        output = 1.0 * this.x_2 + -1.61854514 * this.z1_2 + 1.0 * this.z2_2;
                        this.z2_2 = this.z1_2;
                        this.z1_2 = this.x_2;
                        break;
                    case 2: // Notch Sampling rate: 500.0 Hz, frequency: [58.0, 62.0] Hz.
                        this.x_1 = output - (-1.40810535 * this.z1_1) - (0.96443153 * this.z2_1);
                        output = 0.96508099 * this.x_1 + (-1.40747202 * this.z1_1) + (0.96508099 * this.z2_1);
                        this.z2_1 = this.z1_1;
                        this.z1_1 = this.x_1;
                        // Second filter section
                        this.x_2 = output - (-1.45687509 * this.z1_2) - (0.96573127 * this.z2_2);
                        output = 1.00000000 * this.x_2 + (-1.45839783 * this.z1_2) + (1.00000000 * this.z2_2);
                        this.z2_2 = this.z1_2;
                        this.z1_2 = this.x_2;
                        break;
                    default:
                        break;
                }
                break;

            case 250: // 250Hz
                switch (type) {
                    case 1: // Notch Sampling rate: 250.0 Hz, frequency: [48.0, 52.0] Hz.
                        this.x_1 = output - (-0.53127491 * this.z1_1) - (0.93061518 * this.z2_1);
                        output = 0.93137886 * this.x_1 + (-0.57635175 * this.z1_1) + 0.93137886 * this.z2_1;
                        this.z2_1 = this.z1_1;
                        this.z1_1 = this.x_1;

                        // Second filter section
                        this.x_2 = output - (-0.66243374 * this.z1_2) - (0.93214913 * this.z2_2);
                        output = 1.00000000 * this.x_2 + (-0.61881558 * this.z1_2) + 1.00000000 * this.z2_2;
                        this.z2_2 = this.z1_2;
                        this.z1_2 = this.x_2;
                        break;

                    case 2: // Notch Sampling rate: 250.0 Hz, frequency: [58.0, 62.0] Hz.
                        this.x_1 = output - (-0.05269865 * this.z1_1) - (0.93123336 * this.z2_1);
                        output = 0.93137886 * this.x_1 + (-0.11711144 * this.z1_1) + 0.93137886 * this.z2_1;
                        this.z2_1 = this.z1_1;
                        this.z1_1 = this.x_1;

                        // Second filter section
                        this.x_2 = output - (-0.18985625 * this.z1_2) - (0.93153034 * this.z2_2);
                        output = 1.00000000 * this.x_2 + (-0.12573985 * this.z1_2) + 1.00000000 * this.z2_2;
                        this.z2_2 = this.z1_2;
                        this.z1_2 = this.x_2;
                        break;

                    default:
                        break;
                }
                break;

            default:
                break;
        }

        return output;
    }
}



